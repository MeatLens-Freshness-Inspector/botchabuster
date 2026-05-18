import type { FreshnessClassification } from "@/types/inspection";

export interface SquareGuideBox {
  x: number;
  y: number;
  size: number;
  normalized?: boolean;
}

export interface SquareCropRegion {
  left: number;
  top: number;
  side: number;
}

export interface PreprocessImageOptions {
  guideBox?: SquareGuideBox | null;
  size?: number;
  mimeType?: string;
  quality?: number;
  fileName?: string;
}

interface CenteredObjectCoverGuideBoxOptions {
  sourceWidth: number;
  sourceHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  overlayWidthRatio: number;
}

export interface MeatLensModelMetadata {
  backbone?: string;
  preprocess_function_name?: string;
  input_size?: number | [number, number] | { width?: number; height?: number };
  image_crop_mode?: string;
  label_order?: string[];
}

export type ModelPreprocessMode = "mobilenet_v3" | "efficientnet" | "resnet50" | "identity";

export type FreshnessRecommendation = "Good for Consumption" | "Consume Immediately" | "Not Suitable";

export const DEFAULT_MEATLENS_INPUT_SIZE = 224;
const RESNET_MEAN_BGR = {
  b: 103.939,
  g: 116.779,
  r: 123.68,
};

const DEFAULT_LABEL_ORDER_4 = ["fresh", "acceptable", "warning", "spoiled"] as const;
const DEFAULT_LABEL_ORDER_3 = ["fresh", "not fresh", "spoiled"] as const;
const DEFAULT_LABEL_ORDER_2 = ["fresh", "spoiled"] as const;
const LOW_CONFIDENCE_WARNING_THRESHOLD_PERCENT = 90;

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Converts a centered square overlay drawn on an object-cover preview surface
 * into normalized source-image guide-box coordinates.
 */
export function resolveCenteredObjectCoverGuideBox({
  sourceWidth,
  sourceHeight,
  viewportWidth,
  viewportHeight,
  overlayWidthRatio,
}: CenteredObjectCoverGuideBoxOptions): SquareGuideBox {
  const safeSourceWidth = Math.max(1, sourceWidth);
  const safeSourceHeight = Math.max(1, sourceHeight);
  const safeViewportWidth = Math.max(1, viewportWidth);
  const safeViewportHeight = Math.max(1, viewportHeight);
  const safeOverlayRatio = clamp(overlayWidthRatio, 0.01, 1);

  const coverScale = Math.max(
    safeViewportWidth / safeSourceWidth,
    safeViewportHeight / safeSourceHeight
  );
  const renderedWidth = safeSourceWidth * coverScale;
  const renderedHeight = safeSourceHeight * coverScale;
  const horizontalCrop = (renderedWidth - safeViewportWidth) / 2;
  const verticalCrop = (renderedHeight - safeViewportHeight) / 2;

  const overlaySideInViewport = safeViewportWidth * safeOverlayRatio;
  const overlayLeftInViewport = (safeViewportWidth - overlaySideInViewport) / 2;
  const overlayTopInViewport = (safeViewportHeight - overlaySideInViewport) / 2;

  const projectedSide = overlaySideInViewport / coverScale;
  const sourceMinSide = Math.min(safeSourceWidth, safeSourceHeight);
  const clampedSide = clamp(projectedSide, 1, sourceMinSide);

  const projectedLeft = (overlayLeftInViewport + horizontalCrop) / coverScale;
  const projectedTop = (overlayTopInViewport + verticalCrop) / coverScale;
  const clampedLeft = clamp(projectedLeft, 0, safeSourceWidth - clampedSide);
  const clampedTop = clamp(projectedTop, 0, safeSourceHeight - clampedSide);

  return {
    x: clampedLeft / safeSourceWidth,
    y: clampedTop / safeSourceHeight,
    size: clampedSide / sourceMinSide,
    normalized: true,
  };
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
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

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to export preprocessed image."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

function resolveOutputExtension(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized === "image/png") {
    return ".png";
  }
  if (normalized === "image/webp") {
    return ".webp";
  }
  return ".jpg";
}

export function resolveSquareCropRegion(
  imageWidth: number,
  imageHeight: number,
  guideBox?: SquareGuideBox | null
): SquareCropRegion {
  const safeWidth = Math.max(1, Math.round(imageWidth));
  const safeHeight = Math.max(1, Math.round(imageHeight));

  const fallbackSide = Math.min(safeWidth, safeHeight);
  const fallbackLeft = Math.round((safeWidth - fallbackSide) / 2);
  const fallbackTop = Math.round((safeHeight - fallbackSide) / 2);

  if (!guideBox || !isFinitePositive(guideBox.size)) {
    return { left: fallbackLeft, top: fallbackTop, side: fallbackSide };
  }

  const minSide = Math.min(safeWidth, safeHeight);

  const requestedSide = guideBox.normalized
    ? guideBox.size * minSide
    : guideBox.size;

  const side = Math.round(clamp(requestedSide, 1, minSide));

  const requestedLeft = guideBox.normalized
    ? guideBox.x * safeWidth
    : guideBox.x;

  const requestedTop = guideBox.normalized
    ? guideBox.y * safeHeight
    : guideBox.y;

  const left = Math.round(clamp(requestedLeft, 0, safeWidth - side));
  const top = Math.round(clamp(requestedTop, 0, safeHeight - side));

  return { left, top, side };
}

export async function createCroppedResizedImageFile(
  imageFile: File,
  options: PreprocessImageOptions = {}
): Promise<File> {
  const targetSize = Math.max(1, Math.round(options.size ?? DEFAULT_MEATLENS_INPUT_SIZE));
  const mimeType = options.mimeType ?? "image/jpeg";
  const quality = clamp(options.quality ?? 0.92, 0, 1);

  const image = await loadImageElement(imageFile);
  const crop = resolveSquareCropRegion(image.width, image.height, options.guideBox);

  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;

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
    targetSize,
    targetSize
  );

  const blob = await canvasToBlob(canvas, mimeType, quality);
  const fileName =
    options.fileName ??
    `${imageFile.name.replace(/\.[^.]+$/, "")}${resolveOutputExtension(mimeType)}`;
  return new File([blob], fileName, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

export function resolveInputSize(metadata?: MeatLensModelMetadata | null): number {
  const rawSize = metadata?.input_size;

  if (isFinitePositive(rawSize)) {
    return Math.round(rawSize);
  }

  if (Array.isArray(rawSize) && rawSize.length >= 2) {
    const width = rawSize[0];
    const height = rawSize[1];
    if (isFinitePositive(width) && isFinitePositive(height)) {
      return Math.round(Math.min(width, height));
    }
  }

  if (rawSize && typeof rawSize === "object") {
    const width = (rawSize as { width?: unknown }).width;
    const height = (rawSize as { height?: unknown }).height;
    if (isFinitePositive(width) && isFinitePositive(height)) {
      return Math.round(Math.min(width, height));
    }
  }

  return DEFAULT_MEATLENS_INPUT_SIZE;
}

function normalizeMetadataHint(value: string): string {
  return value.toLowerCase().replace(/[\s_-]+/g, "");
}

export function resolvePreprocessMode(
  metadata?: MeatLensModelMetadata | null,
  fallbackMode: ModelPreprocessMode = "mobilenet_v3"
): ModelPreprocessMode {
  const preprocessHint = metadata?.preprocess_function_name ?? "";
  const backboneHint = metadata?.backbone ?? "";
  const combinedHint = normalizeMetadataHint(`${preprocessHint} ${backboneHint}`);

  if (
    combinedHint.includes("identity") ||
    combinedHint.includes("passthrough") ||
    combinedHint.includes("raw255") ||
    combinedHint.includes("none")
  ) {
    return "identity";
  }

  if (combinedHint.includes("mobilenetv3")) {
    return "mobilenet_v3";
  }

  if (combinedHint.includes("efficientnet")) {
    return "efficientnet";
  }

  if (combinedHint.includes("resnet")) {
    return "resnet50";
  }

  return fallbackMode;
}

export function preprocessRgbPixel(
  pixel: { r: number; g: number; b: number },
  preprocessMode: ModelPreprocessMode
): [number, number, number] {
  switch (preprocessMode) {
    case "mobilenet_v3": {
      return [pixel.r / 127.5 - 1, pixel.g / 127.5 - 1, pixel.b / 127.5 - 1];
    }
    case "efficientnet": {
      // Keras EfficientNet preprocessing is a pass-through; the exported model
      // typically contains an internal rescaling layer.
      return [pixel.r, pixel.g, pixel.b];
    }
    case "resnet50": {
      // Keras ResNet preprocessing uses BGR channel order and ImageNet means.
      return [pixel.b - RESNET_MEAN_BGR.b, pixel.g - RESNET_MEAN_BGR.g, pixel.r - RESNET_MEAN_BGR.r];
    }
    case "identity":
    default:
      return [pixel.r, pixel.g, pixel.b];
  }
}

export function buildImageTensorData(
  imageData: ImageData,
  channelsFirst: boolean,
  preprocessMode: ModelPreprocessMode
): Float32Array {
  const pixels = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const pixelCount = width * height;

  if (channelsFirst) {
    const channelSize = pixelCount;
    const output = new Float32Array(3 * channelSize);

    for (let index = 0; index < pixelCount; index++) {
      const offset = index * 4;
      const [c0, c1, c2] = preprocessRgbPixel(
        {
          r: pixels[offset],
          g: pixels[offset + 1],
          b: pixels[offset + 2],
        },
        preprocessMode
      );

      output[index] = c0;
      output[channelSize + index] = c1;
      output[channelSize * 2 + index] = c2;
    }

    return output;
  }

  const output = new Float32Array(pixelCount * 3);

  for (let index = 0; index < pixelCount; index++) {
    const offset = index * 4;
    const [c0, c1, c2] = preprocessRgbPixel(
      {
        r: pixels[offset],
        g: pixels[offset + 1],
        b: pixels[offset + 2],
      },
      preprocessMode
    );

    const outputOffset = index * 3;
    output[outputOffset] = c0;
    output[outputOffset + 1] = c1;
    output[outputOffset + 2] = c2;
  }

  return output;
}

export function normalizeClassificationLabel(label: string): FreshnessClassification {
  const normalized = label.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

  if (normalized === "not fresh" || normalized === "notfresh") {
    return "not fresh";
  }

  if (normalized === "fresh") {
    return "fresh";
  }

  if (normalized === "spoiled") {
    return "spoiled";
  }

  if (normalized === "acceptable") {
    return "acceptable";
  }

  if (normalized === "warning") {
    return "warning";
  }

  return "not fresh";
}

export function resolveOutputLabels(classCount: number, metadataLabelOrder?: string[] | null): FreshnessClassification[] {
  const normalizedMetadataOrder = (metadataLabelOrder ?? [])
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
    .map((label) => normalizeClassificationLabel(label));

  if (normalizedMetadataOrder.length === classCount && classCount > 0) {
    return normalizedMetadataOrder;
  }

  if (classCount === 4) {
    return [...DEFAULT_LABEL_ORDER_4];
  }

  if (classCount === 3) {
    return [...DEFAULT_LABEL_ORDER_3];
  }

  if (classCount === 2) {
    return [...DEFAULT_LABEL_ORDER_2];
  }

  return [...DEFAULT_LABEL_ORDER_3].slice(0, Math.max(1, Math.min(classCount, DEFAULT_LABEL_ORDER_3.length)));
}

function softmax(values: number[]): number[] {
  const maxValue = Math.max(...values);
  const exponentials = values.map((value) => Math.exp(value - maxValue));
  const denominator = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / denominator);
}

export function normalizeModelProbabilities(values: number[]): number[] {
  if (values.length === 0) {
    return [];
  }

  const allInUnitRange = values.every((value) => value >= 0 && value <= 1);
  const sum = values.reduce((accumulator, value) => accumulator + value, 0);

  if (allInUnitRange && sum > 0.99 && sum < 1.01) {
    return values;
  }

  return softmax(values);
}

export function parsePrediction(probabilities: number[], labelOrder: string[]): {
  predictedClass: FreshnessClassification;
  confidence: number;
  confidencePercent: number;
  probabilitiesByLabel: Record<string, number>;
} {
  const usableLength = Math.min(probabilities.length, labelOrder.length);
  if (usableLength === 0) {
    return {
      predictedClass: "not fresh",
      confidence: 0,
      confidencePercent: 0,
      probabilitiesByLabel: {},
    };
  }

  const ranked = Array.from({ length: usableLength }, (_, index) => ({
    index,
    value: probabilities[index],
  })).sort((left, right) => right.value - left.value);
  const topPrediction = ranked[0];
  const topClass = normalizeClassificationLabel(labelOrder[topPrediction.index]);
  const topConfidence = clamp(topPrediction.value, 0, 1);
  const topConfidencePercent = Math.round(clamp(topConfidence * 100, 0, 100));
  const secondConfidence = ranked.length > 1 ? clamp(ranked[1].value, 0, 1) : 0;

  const probabilitiesByLabel: Record<string, number> = {};
  for (let index = 0; index < usableLength; index++) {
    const label = normalizeClassificationLabel(labelOrder[index]);
    probabilitiesByLabel[label] = probabilities[index];
  }

  let effectiveConfidence = topConfidence;
  if (topConfidencePercent < LOW_CONFIDENCE_WARNING_THRESHOLD_PERCENT) {
    effectiveConfidence = clamp(topConfidence + secondConfidence, 0, 1);
  }
  const effectiveConfidencePercent = Math.round(clamp(effectiveConfidence * 100, 0, 100));

  let predictedClass = topClass;
  if (effectiveConfidencePercent < LOW_CONFIDENCE_WARNING_THRESHOLD_PERCENT) {
    predictedClass = "warning";
  }

  return {
    predictedClass,
    confidence: effectiveConfidence,
    confidencePercent: effectiveConfidencePercent,
    probabilitiesByLabel,
  };
}

function mapToScoringClass(
  classification: FreshnessClassification
): "fresh" | "acceptable" | "not fresh" | "warning" | "spoiled" {
  if (classification === "fresh") {
    return "fresh";
  }

  if (classification === "acceptable") {
    return "acceptable";
  }

  if (classification === "warning") {
    return "warning";
  }

  if (classification === "spoiled") {
    return "spoiled";
  }

  return "not fresh";
}

export function computeFreshnessScore(predictedClass: string, confidence: number): number {
  const boundedConfidence = clamp(confidence, 0, 1);
  const normalizedClass = mapToScoringClass(normalizeClassificationLabel(predictedClass));

  let score: number;
  if (normalizedClass === "fresh") {
    score = 70 + 30 * boundedConfidence;
  } else if (normalizedClass === "acceptable") {
    score = 60 + 20 * boundedConfidence;
  } else if (normalizedClass === "not fresh") {
    score = 40 + 20 * boundedConfidence;
  } else if (normalizedClass === "warning") {
    score = 20 + 20 * boundedConfidence;
  } else {
    score = 20 - 20 * boundedConfidence;
  }

  return clamp(score, 0, 100);
}

export function classifyRecommendation(score: number): FreshnessRecommendation {
  if (score >= 70) {
    return "Good for Consumption";
  }

  if (score >= 40) {
    return "Consume Immediately";
  }

  return "Not Suitable";
}
