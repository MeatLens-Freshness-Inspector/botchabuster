/**
 * imageQuality.ts
 *
 * Pure utility functions for image quality validation before ONNX inference.
 *
 * Provides a structured ImageQualityResult with typed issue codes, per-issue
 * severity, and numeric metrics so the UI can make informed retake/proceed
 * decisions independently of the model inference contract.
 *
 * ONNX inference contract, class label mapping, and database schema are
 * not referenced here — this module is a pure preprocessing gate only.
 */

// ---------------------------------------------------------------------------
// Thresholds (named constants so they are easy to tune)
// ---------------------------------------------------------------------------

/** Minimum short-side pixel count for a hard fail */
const MIN_RESOLUTION_FAIL_PX = 240;
/** Minimum short-side pixel count for a warning (below this, warn; at/above, pass) */
const MIN_RESOLUTION_WARN_PX = 480;

/** Luminance value below which the image is considered too dark to classify */
const BRIGHTNESS_DARK_FAIL = 30;
/** Luminance value below which the image gets a dark warning */
const BRIGHTNESS_DARK_WARN = 60;
/** Luminance value above which the image gets a bright warning */
const BRIGHTNESS_BRIGHT_WARN = 220;
/** Luminance value above which the image is considered blown-out (hard fail) */
const BRIGHTNESS_BRIGHT_FAIL = 240;

/** Laplacian variance below which the image is considered too blurry (hard fail) */
const SHARPNESS_FAIL = 35;
/** Laplacian variance below which the image gets a blur warning */
const SHARPNESS_WARN = 70;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ImageQualityStatus = "pass" | "warning" | "fail";

export interface ImageQualityIssue {
  code: "LOW_RESOLUTION" | "BLURRY_IMAGE" | "TOO_DARK" | "TOO_BRIGHT";
  message: string;
  severity: "warning" | "fail";
}

export interface ImageQualityResult {
  status: ImageQualityStatus;
  issues: ImageQualityIssue[];
  metrics: {
    width: number;
    height: number;
    brightness?: number;
    sharpness?: number;
  };
  canProceed: boolean;
}

// ---------------------------------------------------------------------------
// validateImageResolution
// ---------------------------------------------------------------------------

/**
 * Checks whether the image dimensions meet minimum quality requirements.
 * Uses the short side (min of width/height) as the constraint dimension.
 *
 * @returns An array of ImageQualityIssue — empty if resolution is acceptable.
 */
export function validateImageResolution(width: number, height: number): ImageQualityIssue[] {
  const shortSide = Math.min(width, height);
  const issues: ImageQualityIssue[] = [];

  if (shortSide < MIN_RESOLUTION_FAIL_PX) {
    issues.push({
      code: "LOW_RESOLUTION",
      message: `Image resolution is too low (${width}×${height}, short side ${shortSide}px). A minimum of ${MIN_RESOLUTION_FAIL_PX}px is required for reliable classification. Retake at a higher resolution.`,
      severity: "fail",
    });
  } else if (shortSide < MIN_RESOLUTION_WARN_PX) {
    issues.push({
      code: "LOW_RESOLUTION",
      message: `Image resolution is below the recommended minimum (${width}×${height}, short side ${shortSide}px < ${MIN_RESOLUTION_WARN_PX}px). Classification accuracy may be reduced.`,
      severity: "warning",
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// calculateBrightness
// ---------------------------------------------------------------------------

/**
 * Computes the mean perceptual luminance of an image using ITU-R BT.601
 * luma coefficients: L = 0.299R + 0.587G + 0.114B.
 *
 * Returns a value in [0, 255]. 0 = pitch black, 255 = pure white.
 */
export function calculateBrightness(imageData: ImageData): number {
  const { data } = imageData;
  const pixelCount = data.length / 4;

  if (pixelCount === 0) {
    return 0;
  }

  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  return sum / pixelCount;
}

// ---------------------------------------------------------------------------
// calculateSharpness
// ---------------------------------------------------------------------------

/**
 * Estimates image sharpness using the variance of the discrete Laplacian.
 *
 * The Laplacian operator amplifies high-frequency edges; its variance is a
 * well-established proxy for perceived sharpness. A higher value means
 * sharper detail; near-zero means blurry or featureless.
 *
 * Returns 0 if the image is smaller than 3×3 (kernel cannot be applied).
 */
export function calculateSharpness(imageData: ImageData): number {
  const { data, width, height } = imageData;

  if (width < 3 || height < 3) {
    return 0;
  }

  // Convert to grayscale first
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }

  // Compute Laplacian variance over interior pixels
  let sum = 0;
  let sumSquares = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const laplacian =
        gray[idx - 1] +
        gray[idx + 1] +
        gray[idx - width] +
        gray[idx + width] -
        4 * gray[idx];

      sum += laplacian;
      sumSquares += laplacian * laplacian;
      count++;
    }
  }

  if (count === 0) {
    return 0;
  }

  const mean = sum / count;
  return sumSquares / count - mean * mean;
}

// ---------------------------------------------------------------------------
// validateImageQuality — aggregation entry point
// ---------------------------------------------------------------------------

/**
 * Runs all quality checks on a captured ImageData and returns a structured
 * ImageQualityResult the UI can use to gate retake vs. proceed decisions.
 *
 * Checks are independent — ALL issues are reported, not just the first.
 *
 * canProceed:
 *   - false  → at least one issue has severity "fail"
 *   - true   → all issues are warnings only (or no issues)
 *
 * status:
 *   - "fail"    → any fail-severity issue
 *   - "warning" → only warning-severity issues
 *   - "pass"    → no issues
 */
export function validateImageQuality(
  imageData: ImageData,
  width: number,
  height: number
): ImageQualityResult {
  const issues: ImageQualityIssue[] = [];

  // 1. Resolution check
  issues.push(...validateImageResolution(width, height));

  // 2. Brightness check
  const brightness = calculateBrightness(imageData);

  if (brightness < BRIGHTNESS_DARK_FAIL) {
    issues.push({
      code: "TOO_DARK",
      message: `Image is too dark (brightness ${brightness.toFixed(1)} < ${BRIGHTNESS_DARK_FAIL}). Improve lighting before retaking.`,
      severity: "fail",
    });
  } else if (brightness < BRIGHTNESS_DARK_WARN) {
    issues.push({
      code: "TOO_DARK",
      message: `Image is underexposed (brightness ${brightness.toFixed(1)}). Consider improving lighting for better accuracy.`,
      severity: "warning",
    });
  } else if (brightness > BRIGHTNESS_BRIGHT_FAIL) {
    issues.push({
      code: "TOO_BRIGHT",
      message: `Image is overexposed (brightness ${brightness.toFixed(1)} > ${BRIGHTNESS_BRIGHT_FAIL}). Reduce direct light or move the sample away from the light source.`,
      severity: "fail",
    });
  } else if (brightness > BRIGHTNESS_BRIGHT_WARN) {
    issues.push({
      code: "TOO_BRIGHT",
      message: `Image may be slightly overexposed (brightness ${brightness.toFixed(1)}). Classification accuracy may be reduced in blown-out areas.`,
      severity: "warning",
    });
  }

  // 3. Sharpness / blur check
  const sharpness = calculateSharpness(imageData);

  if (sharpness < SHARPNESS_FAIL) {
    issues.push({
      code: "BLURRY_IMAGE",
      message: `Image is too blurry (sharpness ${sharpness.toFixed(1)} < ${SHARPNESS_FAIL}). Hold the camera steady and ensure the sample is in focus before retaking.`,
      severity: "fail",
    });
  } else if (sharpness < SHARPNESS_WARN) {
    issues.push({
      code: "BLURRY_IMAGE",
      message: `Image appears soft (sharpness ${sharpness.toFixed(1)}). A sharper capture will improve classification confidence.`,
      severity: "warning",
    });
  }

  // Derive status and canProceed from aggregated issues
  const hasFailIssue = issues.some((issue) => issue.severity === "fail");
  const hasWarningIssue = issues.some((issue) => issue.severity === "warning");

  let status: ImageQualityStatus;
  if (hasFailIssue) {
    status = "fail";
  } else if (hasWarningIssue) {
    status = "warning";
  } else {
    status = "pass";
  }

  return {
    status,
    issues,
    metrics: {
      width,
      height,
      brightness,
      sharpness,
    },
    canProceed: !hasFailIssue,
  };
}
