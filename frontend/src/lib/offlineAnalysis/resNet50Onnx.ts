import type { FreshnessClassification } from "@/types/inspection";
import {
  buildImageTensorData,
  classifyRecommendation,
  computeFreshnessScore,
  normalizeClassificationLabel,
  normalizeModelProbabilities,
  parsePrediction,
  resolveInputSize,
  resolveOutputLabels,
  resolvePreprocessMode,
  resolveSquareCropRegion,
  type FreshnessRecommendation,
  type MeatLensModelMetadata,
  type SquareGuideBox,
} from "./meatLensPipeline";
import type { ModelPredictionResult } from "./mobileNetV3Onnx";

const ENV_MODEL_PATH = (import.meta.env.VITE_RESNET50_MODEL_PATH ?? "").trim();
const ENV_METADATA_PATH = (import.meta.env.VITE_RESNET50_METADATA_PATH ?? "").trim();
const ENV_CLASS_LABELS = (import.meta.env.VITE_RESNET50_CLASS_LABELS ?? "").trim();

const FALLBACK_IMAGE_SIZE = 224;
const RETRY_INTERVAL_MS = 15_000;
const LEGACY_ALLOWED_LABELS = new Set<FreshnessClassification>([
  "fresh",
  "not fresh",
  "spoiled",
  "acceptable",
  "warning",
]);

interface LoadModelOptions {
  forceRetry?: boolean;
}

interface ClassifyWithModelOptions {
  guideBox?: SquareGuideBox | null;
}

interface ModelAssetProfile {
  displayName: string;
  modelCandidatePaths: string[];
  metadataCandidatePaths: string[];
  defaultMetadata: MeatLensModelMetadata;
}

interface InputLayout {
  inputName: string;
  channelsFirst: boolean;
  width: number;
  height: number;
}

interface NodeMetadataLike {
  shape?: ReadonlyArray<number | string>;
  dimensions?: unknown[];
  dims?: unknown[];
}

interface SessionMetadataShape {
  inputMetadata?: Record<string, NodeMetadataLike> | NodeMetadataLike[];
  outputMetadata?: Record<string, NodeMetadataLike> | NodeMetadataLike[];
}

type OrtModule = typeof import("onnxruntime-web");
type OnnxSession = import("onnxruntime-web").InferenceSession;

const DEFAULT_MODEL_METADATA: MeatLensModelMetadata = {
  backbone: "ResNet50",
  preprocess_function_name: "resnet50.preprocess_input",
  input_size: FALLBACK_IMAGE_SIZE,
  image_crop_mode: "center_crop",
  label_order: ["fresh", "acceptable", "warning", "spoiled"],
};

const MODEL_ASSET_PROFILE: ModelAssetProfile = {
  displayName: "ResNet50",
  modelCandidatePaths: [
    "/model/meatlens_resnet50_exp2.onnx",
    "/models/resnet50_meat/meatlens_resnet50_exp2.onnx",
    "/models/resnet50_meat/model.onnx",
    ENV_MODEL_PATH,
  ].filter((path) => path.length > 0),
  metadataCandidatePaths: [
    "/model/meatlens_resnet50_exp2_metadata.json",
    "/models/resnet50_meat/meatlens_resnet50_exp2_metadata.json",
    "/models/resnet50_meat/model_metadata.json",
    ENV_METADATA_PATH,
  ].filter((path) => path.length > 0),
  defaultMetadata: { ...DEFAULT_MODEL_METADATA },
};

let ortModule: OrtModule | null = null;
let session: OnnxSession | null = null;
let loadedModelPath: string | null = null;
let loadPromise: Promise<boolean> | null = null;
let metadataPromise: Promise<MeatLensModelMetadata> | null = null;
let nextRetryAt = 0;
let loadGeneration = 0;

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeDimension(value: unknown, fallback: number): number {
  if (isPositiveNumber(value)) {
    return Math.round(value);
  }

  if (typeof value === "bigint" && value > 0n) {
    return Number(value);
  }

  return fallback;
}

function resolveMetadataEntry(
  metadata: Record<string, NodeMetadataLike> | NodeMetadataLike[] | undefined,
  preferredName?: string
): NodeMetadataLike | undefined {
  if (!metadata) {
    return undefined;
  }

  if (Array.isArray(metadata)) {
    return metadata[0];
  }

  if (preferredName && metadata[preferredName]) {
    return metadata[preferredName];
  }

  const firstKey = Object.keys(metadata)[0];
  return firstKey ? metadata[firstKey] : undefined;
}

function resolveMetadataDims(metadata: NodeMetadataLike | undefined): ReadonlyArray<number | string> {
  if (!metadata) {
    return [];
  }

  if (Array.isArray(metadata.shape)) {
    return metadata.shape;
  }

  if (Array.isArray(metadata.dimensions)) {
    return metadata.dimensions as ReadonlyArray<number | string>;
  }

  if (Array.isArray(metadata.dims)) {
    return metadata.dims as ReadonlyArray<number | string>;
  }

  return [];
}

function deriveInputLayout(activeSession: OnnxSession, fallbackSize: number): InputLayout {
  const inputName = activeSession.inputNames?.[0];
  if (!inputName) {
    throw new Error("ONNX model has no input tensor.");
  }

  const sessionMetadata = activeSession as unknown as SessionMetadataShape;
  const inputMetadata = resolveMetadataEntry(sessionMetadata.inputMetadata, inputName);
  const dims = resolveMetadataDims(inputMetadata);

  if (!Array.isArray(dims) || dims.length < 4) {
    return {
      inputName,
      channelsFirst: true,
      width: fallbackSize,
      height: fallbackSize,
    };
  }

  const d1 = normalizeDimension(dims[1], fallbackSize);
  const d2 = normalizeDimension(dims[2], fallbackSize);
  const d3 = normalizeDimension(dims[3], fallbackSize);

  if (d1 === 3) {
    return { inputName, channelsFirst: true, height: d2, width: d3 };
  }

  if (d3 === 3) {
    return { inputName, channelsFirst: false, height: d1, width: d2 };
  }

  return {
    inputName,
    channelsFirst: true,
    width: d3,
    height: d2,
  };
}

function deriveOutputClassCount(activeSession: OnnxSession): number | null {
  const sessionMetadata = activeSession as unknown as SessionMetadataShape;
  const firstOutputName = activeSession.outputNames?.[0];
  const outputMetadata = resolveMetadataEntry(sessionMetadata.outputMetadata, firstOutputName);
  const dims = resolveMetadataDims(outputMetadata);
  if (!Array.isArray(dims) || dims.length === 0) {
    return null;
  }

  const lastDim = dims[dims.length - 1];
  const classCount = normalizeDimension(lastDim, -1);
  return classCount > 0 ? classCount : null;
}

function sanitizeMetadata(
  payload: unknown,
  defaultMetadata: MeatLensModelMetadata
): MeatLensModelMetadata {
  if (!payload || typeof payload !== "object") {
    return { ...defaultMetadata };
  }

  const candidate = payload as Record<string, unknown>;
  const labelOrder = Array.isArray(candidate.label_order)
    ? candidate.label_order.map((value) => String(value)).map((value) => normalizeClassificationLabel(value))
    : undefined;

  return {
    backbone: typeof candidate.backbone === "string" ? candidate.backbone : defaultMetadata.backbone,
    preprocess_function_name:
      typeof candidate.preprocess_function_name === "string"
        ? candidate.preprocess_function_name
        : defaultMetadata.preprocess_function_name,
    input_size:
      typeof candidate.input_size === "number" || Array.isArray(candidate.input_size)
        ? (candidate.input_size as MeatLensModelMetadata["input_size"])
        : defaultMetadata.input_size,
    image_crop_mode:
      typeof candidate.image_crop_mode === "string"
        ? candidate.image_crop_mode
        : defaultMetadata.image_crop_mode,
    label_order: labelOrder && labelOrder.length > 0 ? labelOrder : defaultMetadata.label_order,
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode source image."));
    };
    image.src = url;
  });
}

function buildCroppedImageData(
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  guideBox?: SquareGuideBox | null
): ImageData {
  const crop = resolveSquareCropRegion(image.width, image.height, guideBox);
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create 2D canvas context.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, crop.left, crop.top, crop.side, crop.side, 0, 0, targetWidth, targetHeight);

  return context.getImageData(0, 0, targetWidth, targetHeight);
}

function parseExplicitClassLabels(): FreshnessClassification[] | null {
  if (!ENV_CLASS_LABELS) {
    return null;
  }

  const parsed = ENV_CLASS_LABELS
    .split(",")
    .map((value) => normalizeClassificationLabel(value))
    .filter(Boolean);

  if (parsed.length === 0) {
    return null;
  }

  if (!parsed.every((label) => LEGACY_ALLOWED_LABELS.has(label))) {
    console.warn("[Model][ResNet50] Ignoring class labels from env because they contain invalid labels.");
    return null;
  }

  return parsed;
}

async function loadModelMetadata(profile: ModelAssetProfile): Promise<MeatLensModelMetadata> {
  if (metadataPromise) {
    return metadataPromise;
  }

  metadataPromise = (async () => {
    for (const path of profile.metadataCandidatePaths) {
      try {
        const response = await fetch(path, { cache: "no-cache" });
        if (!response.ok) {
          continue;
        }

        const metadataJson = await response.json();
        const parsedMetadata = sanitizeMetadata(metadataJson, profile.defaultMetadata);
        console.info(`[Model][ResNet50] Loaded metadata from ${path}`);
        return parsedMetadata;
      } catch {
        // Try next path.
      }
    }

    console.info(`[Model][ResNet50] Metadata file not found; using fallback defaults.`);
    return { ...profile.defaultMetadata };
  })();

  return metadataPromise;
}

async function getOrtModule(): Promise<OrtModule> {
  if (ortModule) {
    return ortModule;
  }

  ortModule = await import("onnxruntime-web");
  const baseUrl = import.meta.env.BASE_URL ?? "/";
  const wasmBasePath = `${baseUrl.replace(/\/?$/, "/")}ort/`;
  ortModule.env.wasm.wasmPaths = {
    wasm: `${wasmBasePath}ort-wasm-simd-threaded.jsep.wasm`,
  };
  ortModule.env.wasm.numThreads = 1;
  ortModule.env.wasm.proxy = false;
  return ortModule;
}

function resetRuntimeModelState(): void {
  loadPromise = null;
  metadataPromise = null;
  loadedModelPath = null;
  nextRetryAt = 0;
}

async function releaseSession(activeSession: OnnxSession | null): Promise<void> {
  if (!activeSession) {
    return;
  }

  const sessionWithRelease = activeSession as OnnxSession & { release?: () => Promise<void> };
  if (typeof sessionWithRelease.release !== "function") {
    return;
  }

  try {
    await sessionWithRelease.release();
  } catch (error) {
    console.warn("[Model][ResNet50] Failed to release previous session:", error);
  }
}

function isReady(): boolean {
  return session !== null;
}

async function tryLoadModelFromCandidates(
  ort: OrtModule,
  profile: ModelAssetProfile,
  generation: number
): Promise<boolean> {
  let lastError: unknown;

  for (const modelPath of profile.modelCandidatePaths) {
    try {
      const createdSession = await ort.InferenceSession.create(modelPath, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "basic",
      });

      if (generation !== loadGeneration) {
        await releaseSession(createdSession);
        return false;
      }

      session = createdSession;
      loadedModelPath = modelPath;
      console.info(`[Model][ResNet50] Loaded model from ${modelPath}`);
      return true;
    } catch (error) {
      lastError = error;
    }
  }

  console.info(`[Model][ResNet50] Model not available yet.`, lastError);
  return false;
}

export async function loadResNet50Model(options: LoadModelOptions = {}): Promise<boolean> {
  if (session) {
    return true;
  }

  if (loadPromise) {
    return loadPromise;
  }

  if (!options.forceRetry && Date.now() < nextRetryAt) {
    return false;
  }

  const generation = loadGeneration;
  loadPromise = (async () => {
    try {
      const ort = await getOrtModule();
      await loadModelMetadata(MODEL_ASSET_PROFILE);
      if (generation !== loadGeneration) {
        return false;
      }
      return await tryLoadModelFromCandidates(ort, MODEL_ASSET_PROFILE, generation);
    } catch (error) {
      console.warn("[Model][ResNet50] Runtime initialization failed:", error);
      return false;
    } finally {
      loadPromise = null;
      if (!session) {
        nextRetryAt = Date.now() + RETRY_INTERVAL_MS;
      }
    }
  })();

  return loadPromise;
}

export function isResNet50Ready(): boolean {
  return isReady();
}

export function prewarmResNet50Model(): void {
  if (navigator.onLine && !session) {
    void loadResNet50Model();
  }
}

export function getLoadedResNet50ModelPath(): string | null {
  return loadedModelPath;
}

export async function classifyWithResNet50(
  imageFile: File,
  options: ClassifyWithModelOptions = {}
): Promise<ModelPredictionResult | null> {
  if (!session) {
    return null;
  }

  try {
    const ort = await getOrtModule();
    const metadata = await loadModelMetadata(MODEL_ASSET_PROFILE);
    const preferredInputSize = resolveInputSize(metadata);
    const layout = deriveInputLayout(session, preferredInputSize);
    const targetWidth = layout.width || preferredInputSize || FALLBACK_IMAGE_SIZE;
    const targetHeight = layout.height || preferredInputSize || FALLBACK_IMAGE_SIZE;
    const preprocessMode = resolvePreprocessMode(metadata, "resnet50");
    const image = await loadImage(imageFile);
    const imageData = buildCroppedImageData(image, targetWidth, targetHeight, options.guideBox);
    const tensorData = buildImageTensorData(imageData, layout.channelsFirst, preprocessMode);

    const inputTensor = new ort.Tensor(
      "float32",
      tensorData,
      layout.channelsFirst
        ? [1, 3, targetHeight, targetWidth]
        : [1, targetHeight, targetWidth, 3]
    );

    const feeds: Record<string, unknown> = { [layout.inputName]: inputTensor };
    const outputMap = await session.run(feeds as never);
    const firstOutputName = session.outputNames?.[0];
    const firstOutput = (firstOutputName ? (outputMap as Record<string, unknown>)[firstOutputName] : null) as
      | { data?: Float32Array | number[] }
      | null;

    if (!firstOutput?.data) {
      throw new Error("Model produced no output tensor.");
    }

    const logits = Array.from(firstOutput.data as ArrayLike<number>);
    const modelClassCount = deriveOutputClassCount(session) ?? logits.length;
    const usableClassCount = Math.min(modelClassCount, logits.length);

    if (usableClassCount < 2) {
      console.warn(`[Model][ResNet50] Unexpected output length ${logits.length}; expected at least 2 classes.`);
      return null;
    }

    const explicitLabels = parseExplicitClassLabels();
    const classLabels =
      explicitLabels?.length === usableClassCount
        ? explicitLabels
        : resolveOutputLabels(usableClassCount, metadata.label_order);

    if (classLabels.length !== usableClassCount) {
      console.warn(`[Model][ResNet50] Could not map ${usableClassCount} output classes to labels.`);
      return null;
    }

    const probabilities = normalizeModelProbabilities(logits.slice(0, usableClassCount));
    const prediction = parsePrediction(probabilities, classLabels);
    const freshnessScore = computeFreshnessScore(prediction.predictedClass, prediction.confidence);

    return {
      classification: prediction.predictedClass,
      confidence: prediction.confidencePercent,
      confidenceProbability: prediction.confidence,
      probabilities: prediction.probabilitiesByLabel as Partial<Record<FreshnessClassification, number>>,
      freshnessScore,
      recommendation: classifyRecommendation(freshnessScore),
      labelOrder: classLabels,
      metadata,
      modelPath: loadedModelPath,
    };
  } catch (error) {
    console.warn("[Model][ResNet50] Inference failed:", error);
    return null;
  }
}
