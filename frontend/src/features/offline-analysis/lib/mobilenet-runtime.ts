import type { FreshnessClassification } from "@/entities/inspection";
import {
  buildImageTensorData,
  classifyRecommendation,
  computeFreshnessScore,
  normalizeModelProbabilities,
  parsePrediction,
  resolveInputSize,
  resolveOutputLabels,
  resolvePreprocessMode,
  resolveSquareCropRegion,
  type FreshnessRecommendation,
  type MeatLensModelMetadata,
  type SquareGuideBox,
} from "./meat-lens-pipeline";
import {
  deriveInputLayout,
  deriveOutputClassCount,
  parseExplicitClassLabels,
  sanitizeModelMetadata,
} from "./mobilenet-runtime-shapes";
import {
  MobileNetSession,
  type MobileNetModelVariant,
  type MobileNetOnnxSession,
  type ModelPreprocessContract,
} from "./mobilenet-session";
import { resolveMobileNetGuideBox } from "./mobilenet-input-mode";
import { DEFAULT_DISABLE_ROI_SEGMENTATION } from "./preprocessing-defaults";

const ENV_MODEL_PATH = (
  import.meta.env?.VITE_ONNX_MODEL_PATH ?? ""
).trim();
const ENV_CLASS_LABELS = (
  import.meta.env?.VITE_ONNX_CLASS_LABELS ?? ""
).trim();
const ENV_METADATA_PATH = (import.meta.env?.VITE_MODEL_METADATA_PATH ?? "").trim();

function isMobileNetAssetPath(path: string): boolean {
  const normalized = path.toLowerCase();
  return (
    normalized.includes("mobilenet") ||
    normalized.includes("mobilenetv3") ||
    normalized.includes("meatlens_best_model")
  );
}

const ENV_MOBILE_MODEL_PATH =
  ENV_MODEL_PATH.length > 0 && isMobileNetAssetPath(ENV_MODEL_PATH)
    ? ENV_MODEL_PATH
    : "";
const ENV_MOBILE_METADATA_PATH =
  ENV_METADATA_PATH.length > 0 && isMobileNetAssetPath(ENV_METADATA_PATH)
    ? ENV_METADATA_PATH
    : "";

if (ENV_MODEL_PATH.length > 0 && !ENV_MOBILE_MODEL_PATH) {
  console.warn("[Model][ONNX] Ignoring VITE_ONNX_MODEL_PATH because it does not appear to be a MobileNetV3 asset.");
}

if (ENV_METADATA_PATH.length > 0 && !ENV_MOBILE_METADATA_PATH) {
  console.warn("[Model][ONNX] Ignoring VITE_MODEL_METADATA_PATH because it does not appear to be MobileNetV3 metadata.");
}

const FALLBACK_IMAGE_SIZE = 224;
const RETRY_INTERVAL_MS = 15_000;
interface ModelAssetProfile {
  variant: MobileNetModelVariant;
  displayName: string;
  preprocessContract: ModelPreprocessContract;
  modelCandidatePaths: string[];
  metadataCandidatePaths: string[];
  defaultMetadata: MeatLensModelMetadata;
}

const DEFAULT_MODEL_METADATA: MeatLensModelMetadata = {
  backbone: "MobileNetV3Small",
  preprocess_function_name: "identity",
  input_size: FALLBACK_IMAGE_SIZE,
  image_crop_mode: "center_crop",
  label_order: ["fresh", "not fresh", "spoiled"],
};

const MODEL_ASSET_PROFILES: Record<MobileNetModelVariant, ModelAssetProfile> = {
  default: {
    variant: "default",
    displayName: "MobileNetV3Small seed42",
    preprocessContract: "legacy",
    modelCandidatePaths: Array.from(
      new Set(
        [
          "/model/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only.onnx",
          "/model/meatlens_mobilenetv3small_cnn_only.onnx",
          "/models/mobilenetv3_meat/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only.onnx",
          "/models/mobilenetv3_meat/meatlens_mobilenetv3small_cnn_only.onnx",
          "/models/mobilenetv3_meat/model.onnx",
          ENV_MOBILE_MODEL_PATH,
        ].filter((path) => path.length > 0)
      )
    ),
    metadataCandidatePaths: [
      "/model/NEW-meatlens_best_model_metadata.json",
      "/model/NEW-meatlens_mobilenetv3small_cnn_only_metadata.json",
      "/model/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata.json",
      "/model/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata (1).json",
      "/models/mobilenetv3_meat/NEW-meatlens_best_model_metadata.json",
      "/models/mobilenetv3_meat/NEW-meatlens_mobilenetv3small_cnn_only_metadata.json",
      "/models/mobilenetv3_meat/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata.json",
      "/models/mobilenetv3_meat/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata (1).json",
      "/models/mobilenetv3_meat/meatlens_best_model_metadata.json",
      "/models/mobilenetv3_meat/meatlens_mobilenetv3small_cnn_only_metadata.json",
      "/models/mobilenetv3_meat/meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata.json",
      "/models/mobilenetv3_meat/meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata (1).json",
      "/model/meatlens_mobilenetv3small_metadata.json",
      ENV_MOBILE_METADATA_PATH,
      "/model/meatlens_best_model_metadata.json",
      "/models/meatlens_best_model_metadata.json",
    ].filter((path) => path.length > 0),
    defaultMetadata: { ...DEFAULT_MODEL_METADATA },
  },
  seed123_model2: {
    variant: "seed123_model2",
    displayName: "MobileNetV3Small seed123 model2",
    preprocessContract: "segmented_center_roi",
    modelCandidatePaths: [
      "/model/model2/meatlens_final_8samples_cnn_only_mobilenetv3small_seed123.onnx",
      "/model-old/model2/meatlens_final_8samples_cnn_only_mobilenetv3small_seed123.onnx",
      "/models/model2/meatlens_final_8samples_cnn_only_mobilenetv3small_seed123.onnx",
      "/models/mobilenetv3_meat/model2/meatlens_final_8samples_cnn_only_mobilenetv3small_seed123.onnx",
    ],
    metadataCandidatePaths: [
      "/model/model2/meatlens_final_8samples_cnn_only_mobilenetv3small_seed123_metadata.json",
      "/model-old/model2/meatlens_final_8samples_cnn_only_mobilenetv3small_seed123_metadata.json",
      "/models/model2/meatlens_final_8samples_cnn_only_mobilenetv3small_seed123_metadata.json",
      "/models/mobilenetv3_meat/model2/meatlens_final_8samples_cnn_only_mobilenetv3small_seed123_metadata.json",
    ],
    defaultMetadata: {
      ...DEFAULT_MODEL_METADATA,
      image_crop_mode: "preprocessed_hsv_lab_threshold_roi_224",
      label_order: ["fresh", "not fresh", "spoiled"],
    },
  },
  primary: {
    variant: "primary",
    displayName: "Primary MobileNetV3Small",
    preprocessContract: "segmented_center_roi",
    modelCandidatePaths: [
      "/model/model3/meatlens_roboflow_mobilenetv3small_8fold_final.onnx",
      "/models/model3/meatlens_roboflow_mobilenetv3small_8fold_final.onnx",
    ],
    metadataCandidatePaths: [
      "/model/model3/meatlens_roboflow_mobilenetv3small_8fold_final_metadata.json",
      "/models/model3/meatlens_roboflow_mobilenetv3small_8fold_final_metadata.json",
    ],
    defaultMetadata: {
      ...DEFAULT_MODEL_METADATA,
      image_crop_mode: "preprocessed_hsv_lab_threshold_roi_224",
      label_order: ["fresh", "not fresh", "spoiled"],
    },
  },
};

// Keeps the import type-safe while still lazy-loading the runtime.
type OrtModule = typeof import("onnxruntime-web");
type OnnxSession = MobileNetOnnxSession;

export interface ModelPredictionResult {
  classification: FreshnessClassification;
  confidence: number;
  confidenceProbability: number;
  probabilities: Partial<Record<FreshnessClassification, number>>;
  freshnessScore: number;
  recommendation: FreshnessRecommendation;
  labelOrder: FreshnessClassification[];
  metadata: MeatLensModelMetadata;
  modelPath?: string | null;
}

interface LoadModelOptions {
  forceRetry?: boolean;
}

interface ClassifyWithModelOptions {
  guideBox?: SquareGuideBox | null;
  disableRoiSegmentation?: boolean;
}

let ortModule: OrtModule | null = null;
const modelSession = new MobileNetSession();

function getModelProfile(variant: MobileNetModelVariant): ModelAssetProfile {
  return MODEL_ASSET_PROFILES[variant];
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
    console.warn("[Model][ONNX] Failed to release previous session:", error);
  }
}

export function setActiveMobileNetModelVariant(variant: MobileNetModelVariant): void {
  if (modelSession.activeModelVariant === variant) {
    return;
  }

  modelSession.switchVariant(variant);
  console.info(`[Model][ONNX] Switched model variant to ${getModelProfile(variant).displayName}`);
}

export function getActiveMobileNetModelVariant(): MobileNetModelVariant {
  return modelSession.activeModelVariant;
}

export function getActiveModelPreprocessContract(): ModelPreprocessContract {
  return getModelProfile(modelSession.activeModelVariant).preprocessContract;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not decode image file."));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
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

  context.drawImage(
    image,
    crop.left,
    crop.top,
    crop.side,
    crop.side,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return context.getImageData(0, 0, targetWidth, targetHeight);
}

async function loadModelMetadata(
  variant: MobileNetModelVariant,
  profile: ModelAssetProfile,
): Promise<MeatLensModelMetadata> {
  const runtime = modelSession.getRuntime(variant);
  if (runtime.metadataPromise) {
    return runtime.metadataPromise;
  }

  runtime.metadataPromise = (async () => {
    for (const path of profile.metadataCandidatePaths) {
      try {
        const response = await fetch(path, { cache: "no-cache" });
        if (!response.ok) {
          continue;
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.toLowerCase().includes("text/html")) {
          continue;
        }

        const metadataJson = await response.json();
        const parsedMetadata = sanitizeModelMetadata(metadataJson, profile.defaultMetadata);
        console.info(`[Model][ONNX] Loaded metadata from ${path}`);
        return parsedMetadata;
      } catch {
        // Try the next metadata location.
      }
    }

    console.info(`[Model][ONNX] Metadata file not found for ${profile.displayName}; using fallback defaults.`);
    return { ...profile.defaultMetadata };
  })();
  return runtime.metadataPromise;
}

async function getOrtModule(): Promise<OrtModule> {
  if (ortModule) {
    return ortModule;
  }

  ortModule = await import("onnxruntime-web");
  const baseUrl = import.meta.env?.BASE_URL ?? "/";
  const wasmBasePath = `${baseUrl.replace(/\/?$/, "/")}ort/`;
  // Override only the .wasm binary URL so ORT can keep using its embedded
  // .mjs loader module. This avoids Vite /public "?import" failures.
  ortModule.env.wasm.wasmPaths = {
    wasm: `${wasmBasePath}ort-wasm-simd-threaded.jsep.wasm`,
  };
  ortModule.env.wasm.numThreads = 1;
  ortModule.env.wasm.proxy = false;
  return ortModule;
}

async function tryLoadModelFromCandidates(
  ort: OrtModule,
  variant: MobileNetModelVariant,
  profile: ModelAssetProfile,
  generation: number
): Promise<boolean> {
  const runtime = modelSession.getRuntime(variant);
  let lastError: unknown;

  for (const modelPath of profile.modelCandidatePaths) {
    try {
      const checkRes = await fetch(modelPath, { method: "HEAD", cache: "no-cache" }).catch(() => null);
      if (checkRes) {
        if (!checkRes.ok) continue;
        const contentType = checkRes.headers.get("content-type");
        if (contentType && contentType.toLowerCase().includes("text/html")) {
          continue;
        }
      }

      const createdSession = await ort.InferenceSession.create(modelPath, {
        executionProviders: ["wasm"],
        // "all" can noticeably increase first-load session build time on low-end
        // devices. "basic" trades a little inference speed for faster startup.
        graphOptimizationLevel: "basic",
      });

      if (generation !== runtime.loadGeneration || profile.variant !== variant) {
        await releaseSession(createdSession);
        return false;
      }

      runtime.session = createdSession;
      runtime.loadedModelPath = modelPath;
      console.info(`[Model][ONNX] Loaded model from ${modelPath} (${profile.displayName})`);
      return true;
    } catch (error) {
      lastError = error;
    }
  }

  console.info(`[Model][ONNX] Model not available yet for ${profile.displayName}.`, lastError);
  return false;
}

export async function loadMobileNetV3ModelVariant(
  variant: MobileNetModelVariant,
  options: LoadModelOptions = {},
): Promise<boolean> {
  const runtime = modelSession.getRuntime(variant);
  if (runtime.session) {
    return true;
  }

  if (runtime.loadPromise) {
    return runtime.loadPromise;
  }

  if (!options.forceRetry && Date.now() < runtime.nextRetryAt) {
    return false;
  }

  const profile = getModelProfile(variant);
  const generation = runtime.loadGeneration;

  runtime.loadPromise = (async () => {
    try {
      const ort = await getOrtModule();
      await loadModelMetadata(variant, profile);
      if (generation !== runtime.loadGeneration) {
        return false;
      }
      return await tryLoadModelFromCandidates(ort, variant, profile, generation);
    } catch (error) {
      console.warn("[Model][ONNX] Runtime initialization failed:", error);
      return false;
    } finally {
      runtime.loadPromise = null;
      if (!runtime.session) {
        runtime.nextRetryAt = Date.now() + RETRY_INTERVAL_MS;
      }
    }
  })();

  return runtime.loadPromise;
}

export function loadMobileNetV3Model(options: LoadModelOptions = {}): Promise<boolean> {
  return loadMobileNetV3ModelVariant(modelSession.activeModelVariant, options);
}

export function isModelReady(): boolean {
  return modelSession.getRuntime().session !== null;
}

export async function classifyWithMobileNetV3(
  imageFile: File,
  options: ClassifyWithModelOptions = {}
): Promise<ModelPredictionResult | null> {
  const activeVariant = modelSession.activeModelVariant;
  const runtime = modelSession.getRuntime(activeVariant);
  const activeSession = runtime.session;
  if (!activeSession) {
    return null;
  }

  try {
    const ort = await getOrtModule();
    const profile = getModelProfile(activeVariant);
    const metadata = await loadModelMetadata(activeVariant, profile);
    const preferredInputSize = resolveInputSize(metadata);
    const layout = deriveInputLayout(activeSession, preferredInputSize);

    const targetWidth = layout.width || preferredInputSize || FALLBACK_IMAGE_SIZE;
    const targetHeight = layout.height || preferredInputSize || FALLBACK_IMAGE_SIZE;

    const preprocessMode = resolvePreprocessMode(metadata, "identity");
    const image = await loadImage(imageFile);
    const guideBox = resolveMobileNetGuideBox({
      preprocessContract: profile.preprocessContract,
      guideBox: options.guideBox ?? null,
      disableRoiSegmentation:
        options.disableRoiSegmentation ?? DEFAULT_DISABLE_ROI_SEGMENTATION,
    });
    const imageData = buildCroppedImageData(image, targetWidth, targetHeight, guideBox);
    const tensorData = buildImageTensorData(imageData, layout.channelsFirst, preprocessMode);

    const inputTensor = new ort.Tensor(
      "float32",
      tensorData,
      layout.channelsFirst
        ? [1, 3, targetHeight, targetWidth]
        : [1, targetHeight, targetWidth, 3]
    );

    const feeds: Record<string, unknown> = { [layout.inputName]: inputTensor };
    const outputMap = await activeSession.run(feeds as never);

    const firstOutputName = activeSession.outputNames?.[0];
    const firstOutput = (firstOutputName ? (outputMap as Record<string, unknown>)[firstOutputName] : null) as
      | { data?: Float32Array | number[] }
      | null;

    if (!firstOutput?.data) {
      throw new Error("Model produced no output tensor.");
    }

    const logits = Array.from(firstOutput.data as ArrayLike<number>);
    const modelClassCount = deriveOutputClassCount(activeSession) ?? logits.length;
    const usableClassCount = Math.min(modelClassCount, logits.length);

    if (usableClassCount < 2) {
      console.warn(
        `[Model][ONNX] Unexpected output length ${logits.length}; expected at least 2 classes.`
      );
      return null;
    }

    const explicitLabels = parseExplicitClassLabels(ENV_CLASS_LABELS);
    const classLabels =
      explicitLabels?.length === usableClassCount
        ? explicitLabels
        : resolveOutputLabels(usableClassCount, metadata.label_order);

    if (classLabels.length !== usableClassCount) {
      console.warn(
        `[Model][ONNX] Could not map ${usableClassCount} output classes to labels.`
      );
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
      modelPath: runtime.loadedModelPath,
    };
  } catch (error) {
    console.warn("[Model][ONNX] Inference failed:", error);
    return null;
  }
}

export function prewarmModel(): void {
  if (navigator.onLine && !modelSession.getRuntime().session) {
    void loadMobileNetV3Model();
  }
}

export function getLoadedModelPath(): string | null {
  return modelSession.getRuntime().loadedModelPath;
}
