export interface CaptureQualityResult {
  accepted: boolean;
  reasons: string[];
}

const CLIENT_MAX_CENTER_OFFSET = 0.2;
const MIN_FOREGROUND_PIXEL_RATIO = 0.025;

// Blur gating is adaptive to scene contrast to avoid false positives on smooth cuts.
const BASE_BLUR_THRESHOLD = 95;
const MIN_ADAPTIVE_BLUR_THRESHOLD = 55;
const CONTRAST_REFERENCE_VARIANCE = 900;
const STRICT_BLUR_REJECTION_FACTOR = 0.75;

export interface BlurDecision {
  adaptiveThreshold: number;
  rejectThreshold: number;
  rejected: boolean;
}

export interface ForegroundPresenceDecision {
  minRatio: number;
  rejected: boolean;
}

export function getAdaptiveBlurThreshold(contrastVariance: number): number {
  const safeContrast = Math.max(1, contrastVariance);
  const scaled = BASE_BLUR_THRESHOLD * Math.sqrt(safeContrast / CONTRAST_REFERENCE_VARIANCE);
  return clamp(scaled, MIN_ADAPTIVE_BLUR_THRESHOLD, BASE_BLUR_THRESHOLD);
}

export function evaluateBlur(blurScore: number, contrastVariance: number): BlurDecision {
  const adaptiveThreshold = getAdaptiveBlurThreshold(contrastVariance);
  const rejectThreshold = adaptiveThreshold * STRICT_BLUR_REJECTION_FACTOR;

  return {
    adaptiveThreshold,
    rejectThreshold,
    rejected: blurScore < rejectThreshold,
  };
}

export function evaluateForegroundPresence(foregroundRatio: number): ForegroundPresenceDecision {
  return {
    minRatio: MIN_FOREGROUND_PIXEL_RATIO,
    rejected: foregroundRatio < MIN_FOREGROUND_PIXEL_RATIO,
  };
}

export function assessCanvasQuality(canvas: HTMLCanvasElement): CaptureQualityResult {
  const { data, width, height } = getDownscaledImageData(canvas);
  const grayscale = toGrayscale(data, width, height);
  const blurScore = computeLaplacianVariance(grayscale, width, height);
  const contrastVariance = computeVariance(grayscale);
  const blurDecision = evaluateBlur(blurScore, contrastVariance);
  const centerOffset = computeForegroundCenterOffset(grayscale, width, height);
  const foregroundDecision = evaluateForegroundPresence(centerOffset.foregroundRatio);

  const reasons: string[] = [];
  if (foregroundDecision.rejected) {
    reasons.push(
      `No meat detected in frame (foreground ${(centerOffset.foregroundRatio * 100).toFixed(1)}% < ${(foregroundDecision.minRatio * 100).toFixed(1)}%). Place the meat sample inside the guide box and retake.`
    );
  }
  if (blurDecision.rejected) {
    reasons.push(
      `Image appears blurry (sharpness ${blurScore.toFixed(1)} < ${blurDecision.rejectThreshold.toFixed(1)}). Retake with steadier focus.`
    );
  }
  if (
    !foregroundDecision.rejected &&
    (
      Math.abs(centerOffset.offsetX) > CLIENT_MAX_CENTER_OFFSET ||
      Math.abs(centerOffset.offsetY) > CLIENT_MAX_CENTER_OFFSET
    )
  ) {
    reasons.push("Image is off-center. Center the sample before using this photo.");
  }

  return { accepted: reasons.length === 0, reasons };
}

export async function assessFileQuality(file: File): Promise<CaptureQualityResult> {
  const imageBitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { accepted: false, reasons: ["Unable to analyze selected image."] };
  }

  ctx.drawImage(imageBitmap, 0, 0);
  imageBitmap.close();
  return assessCanvasQuality(canvas);
}

function getDownscaledImageData(canvas: HTMLCanvasElement): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const maxSide = 320;
  const scale = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
  const width = Math.max(1, Math.round(canvas.width * scale));
  const height = Math.max(1, Math.round(canvas.height * scale));

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) {
    return { data: new Uint8ClampedArray(), width: 0, height: 0 };
  }

  tempCtx.drawImage(canvas, 0, 0, width, height);
  const imageData = tempCtx.getImageData(0, 0, width, height);
  return { data: imageData.data, width, height };
}

function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const grayscale = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < grayscale.length; i++, p += 4) {
    grayscale[i] = Math.round(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
  }
  return grayscale;
}

function computeLaplacianVariance(pixels: Uint8Array, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let sumSquares = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const laplacian =
        pixels[idx - 1] +
        pixels[idx + 1] +
        pixels[idx - width] +
        pixels[idx + width] -
        4 * pixels[idx];

      sum += laplacian;
      sumSquares += laplacian * laplacian;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSquares / count - mean * mean;
}

function computeVariance(values: Uint8Array): number {
  if (values.length === 0) return 0;
  let sum = 0;
  let sumSquares = 0;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    sum += value;
    sumSquares += value * value;
  }

  const mean = sum / values.length;
  return sumSquares / values.length - mean * mean;
}

function computeForegroundCenterOffset(
  pixels: Uint8Array,
  width: number,
  height: number
): { offsetX: number; offsetY: number; foregroundRatio: number } {
  if (width === 0 || height === 0) return { offsetX: 0, offsetY: 0, foregroundRatio: 0 };

  const borderSamples: number[] = [];
  for (let x = 0; x < width; x++) {
    borderSamples.push(pixels[x]);
    borderSamples.push(pixels[(height - 1) * width + x]);
  }
  for (let y = 1; y < height - 1; y++) {
    borderSamples.push(pixels[y * width]);
    borderSamples.push(pixels[y * width + (width - 1)]);
  }

  const backgroundLevel = median(borderSamples);
  const deltaThreshold = 25;

  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const intensity = pixels[y * width + x];
      if (Math.abs(intensity - backgroundLevel) > deltaThreshold) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }

  if (count === 0) return { offsetX: 1, offsetY: 1, foregroundRatio: 0 };

  const centroidX = sumX / count;
  const centroidY = sumY / count;
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;

  return {
    offsetX: (centroidX - centerX) / width,
    offsetY: (centroidY - centerY) / height,
    foregroundRatio: count / (width * height),
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
