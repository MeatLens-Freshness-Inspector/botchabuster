import type { FreshnessClassification } from "@/entities/inspection";
import {
  createCroppedResizedImageFile as prepareCroppedResizedImageFile,
  createModelInputImageFile as prepareModelInputImageFile,
} from "@/features/offline-analysis/lib/image-input";
import {
  applyRoiSegmentationWithFallback as applyFeatureRoiSegmentationWithFallback,
} from "@/features/offline-analysis/lib/roi-segmentation";

export {
  resolveCenteredObjectCoverGuideBox,
  resolveSquareCropRegion,
} from "@/features/offline-analysis/lib/image-crop";

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

export interface ModelInputPreparationOptions extends PreprocessImageOptions {
  forceCenterCrop?: boolean;
  applySegmentation?: boolean;
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
const SEGMENTATION_BACKGROUND_GRAY = 127;
const SEGMENTATION_MIN_COMPONENT_RATIO = 0.015;

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toLinearRgb(channel: number): number {
  const normalized = channel / 255;
  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }
  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function rgbToHsv(pixel: { r: number; g: number; b: number }): { h: number; s: number; v: number } {
  const r = pixel.r / 255;
  const g = pixel.g / 255;
  const b = pixel.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  if (delta > 0) {
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
  }

  const h = (hue * 60 + 360) % 360;
  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return { h, s, v };
}

function rgbToLab(pixel: { r: number; g: number; b: number }): { l: number; a: number; b: number } {
  const r = toLinearRgb(pixel.r);
  const g = toLinearRgb(pixel.g);
  const b = toLinearRgb(pixel.b);

  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;

  const xRef = 0.95047;
  const yRef = 1.0;
  const zRef = 1.08883;

  const fx = x / xRef > 0.008856 ? Math.cbrt(x / xRef) : 7.787 * (x / xRef) + 16 / 116;
  const fy = y / yRef > 0.008856 ? Math.cbrt(y / yRef) : 7.787 * (y / yRef) + 16 / 116;
  const fz = z / zRef > 0.008856 ? Math.cbrt(z / zRef) : 7.787 * (z / zRef) + 16 / 116;

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const labB = 200 * (fy - fz);
  return { l, a, b: labB };
}

function isLikelyMeatForeground(pixel: { r: number; g: number; b: number }): boolean {
  const hsv = rgbToHsv(pixel);
  const lab = rgbToLab(pixel);

  const hsvPass =
    hsv.v >= 0.1 &&
    hsv.s >= 0.08 &&
    (hsv.h <= 40 || hsv.h >= 300 || (hsv.h >= 15 && hsv.h <= 75));

  const labPass =
    lab.l >= 12 &&
    lab.l <= 95 &&
    lab.a >= 2 &&
    lab.a <= 55 &&
    lab.b >= -8 &&
    lab.b <= 70;

  const strongLabPass = lab.a >= 10 && lab.b >= 0 && lab.l >= 10 && lab.l <= 95;
  return (hsvPass && labPass) || strongLabPass;
}

function erodeMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const output = new Uint8Array(mask.length);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let keep = 1;

      for (let oy = -1; oy <= 1 && keep; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const neighborIndex = (y + oy) * width + (x + ox);
          if (mask[neighborIndex] === 0) {
            keep = 0;
            break;
          }
        }
      }

      output[y * width + x] = keep;
    }
  }

  return output;
}

function dilateMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const output = new Uint8Array(mask.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let hit = 0;

      for (let oy = -1; oy <= 1 && !hit; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            continue;
          }

          const neighborIndex = ny * width + nx;
          if (mask[neighborIndex] === 1) {
            hit = 1;
            break;
          }
        }
      }

      output[y * width + x] = hit;
    }
  }

  return output;
}

function cleanMaskWithMorphology(mask: Uint8Array, width: number, height: number): Uint8Array {
  const opened = dilateMask(erodeMask(mask, width, height), width, height);
  return erodeMask(dilateMask(opened, width, height), width, height);
}

function selectBestCentralComponent(mask: Uint8Array, width: number, height: number): Uint8Array | null {
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const queue = new Int32Array(totalPixels);
  const componentPixels = new Int32Array(totalPixels);

  let bestScore = Number.NEGATIVE_INFINITY;
  let bestSize = 0;
  let bestPixels: Int32Array | null = null;

  for (let start = 0; start < totalPixels; start++) {
    if (mask[start] === 0 || visited[start] === 1) {
      continue;
    }

    let head = 0;
    let tail = 0;
    let componentCount = 0;
    let sumX = 0;
    let sumY = 0;

    queue[tail++] = start;
    visited[start] = 1;

    while (head < tail) {
      const index = queue[head++];
      componentPixels[componentCount++] = index;

      const x = index % width;
      const y = Math.floor(index / width);
      sumX += x;
      sumY += y;

      if (x > 0) {
        const left = index - 1;
        if (mask[left] === 1 && visited[left] === 0) {
          visited[left] = 1;
          queue[tail++] = left;
        }
      }

      if (x < width - 1) {
        const right = index + 1;
        if (mask[right] === 1 && visited[right] === 0) {
          visited[right] = 1;
          queue[tail++] = right;
        }
      }

      if (y > 0) {
        const top = index - width;
        if (mask[top] === 1 && visited[top] === 0) {
          visited[top] = 1;
          queue[tail++] = top;
        }
      }

      if (y < height - 1) {
        const bottom = index + width;
        if (mask[bottom] === 1 && visited[bottom] === 0) {
          visited[bottom] = 1;
          queue[tail++] = bottom;
        }
      }
    }

    if (componentCount === 0) {
      continue;
    }

    const centroidX = sumX / componentCount;
    const centroidY = sumY / componentCount;
    const dx = centroidX - centerX;
    const dy = centroidY - centerY;
    const distancePenalty = (dx * dx + dy * dy) / (width * width + height * height);
    const areaRatio = componentCount / totalPixels;
    const score = areaRatio * 2 - distancePenalty;

    if (score > bestScore) {
      bestScore = score;
      bestSize = componentCount;
      bestPixels = componentPixels.slice(0, componentCount);
    }
  }

  if (!bestPixels || bestSize < totalPixels * SEGMENTATION_MIN_COMPONENT_RATIO) {
    return null;
  }

  const bestMask = new Uint8Array(totalPixels);
  for (let index = 0; index < bestPixels.length; index++) {
    bestMask[bestPixels[index]] = 1;
  }

  return bestMask;
}

function applyLegacyRoiSegmentationWithFallback(
  imageData: ImageData
): { imageData: ImageData; segmented: boolean } {
  try {
    const width = imageData.width;
    const height = imageData.height;
    const totalPixels = width * height;
    const source = imageData.data;
    const rawMask = new Uint8Array(totalPixels);

    for (let index = 0; index < totalPixels; index++) {
      const pixelOffset = index * 4;
      const pixel = {
        r: source[pixelOffset],
        g: source[pixelOffset + 1],
        b: source[pixelOffset + 2],
      };
      rawMask[index] = isLikelyMeatForeground(pixel) ? 1 : 0;
    }

    const cleanedMask = cleanMaskWithMorphology(rawMask, width, height);
    const bestMask = selectBestCentralComponent(cleanedMask, width, height);

    if (!bestMask) {
      return { imageData, segmented: false };
    }

    const segmentedPixels = new Uint8ClampedArray(source.length);
    for (let index = 0; index < totalPixels; index++) {
      const pixelOffset = index * 4;
      const keepForeground = bestMask[index] === 1;

      if (keepForeground) {
        segmentedPixels[pixelOffset] = source[pixelOffset];
        segmentedPixels[pixelOffset + 1] = source[pixelOffset + 1];
        segmentedPixels[pixelOffset + 2] = source[pixelOffset + 2];
      } else {
        segmentedPixels[pixelOffset] = SEGMENTATION_BACKGROUND_GRAY;
        segmentedPixels[pixelOffset + 1] = SEGMENTATION_BACKGROUND_GRAY;
        segmentedPixels[pixelOffset + 2] = SEGMENTATION_BACKGROUND_GRAY;
      }

      segmentedPixels[pixelOffset + 3] = 255;
    }

    return {
      imageData: new ImageData(segmentedPixels, width, height),
      segmented: true,
    };
  } catch {
    return { imageData, segmented: false };
  }
}

export function applyRoiSegmentationWithFallback(
  imageData: ImageData
): { imageData: ImageData; segmented: boolean } {
  return applyFeatureRoiSegmentationWithFallback(imageData);
}

export async function createCroppedResizedImageFile(
  imageFile: File,
  options: PreprocessImageOptions = {}
): Promise<File> {
  return prepareCroppedResizedImageFile(imageFile, options);
}

export async function createModelInputImageFile(
  imageFile: File,
  options: ModelInputPreparationOptions = {}
): Promise<{ file: File; segmentationApplied: boolean }> {
  return prepareModelInputImageFile(
    imageFile,
    options,
    applyRoiSegmentationWithFallback
  );
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
  const canMergeLowConfidencePair = (
    first: FreshnessClassification,
    second: FreshnessClassification
  ): boolean => {
    return (
      (first === "fresh" && second === "not fresh") ||
      (first === "not fresh" && second === "fresh") ||
      (first === "not fresh" && second === "spoiled") ||
      (first === "spoiled" && second === "not fresh")
    );
  };

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
  const secondClass = ranked.length > 1
    ? normalizeClassificationLabel(labelOrder[ranked[1].index])
    : null;
  const secondConfidence = ranked.length > 1 ? clamp(ranked[1].value, 0, 1) : 0;

  const probabilitiesByLabel: Record<string, number> = {};
  for (let index = 0; index < usableLength; index++) {
    const label = normalizeClassificationLabel(labelOrder[index]);
    probabilitiesByLabel[label] = probabilities[index];
  }

  let effectiveConfidence = topConfidence;
  if (
    topConfidencePercent < LOW_CONFIDENCE_WARNING_THRESHOLD_PERCENT &&
    secondClass &&
    canMergeLowConfidencePair(topClass, secondClass)
  ) {
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
