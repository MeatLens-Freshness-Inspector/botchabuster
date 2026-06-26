/**
 * image-quality.spec.ts
 *
 * Unit-style tests for src/lib/imageQuality.ts.
 * Follows the same pattern as meatlens-pipeline.spec.ts:
 * pure function imports, no browser interaction required.
 *
 * Tests are written BEFORE implementation (TDD).
 */

import { test, expect } from "@playwright/test";
import {
  calculateBrightness,
  calculateSharpness,
  validateImageResolution,
  validateImageQuality,
  type ImageQualityIssue,
  type ImageQualityResult,
} from "../src/lib/imageQuality";

// ---------------------------------------------------------------------------
// Helpers — synthetic ImageData builders
// ---------------------------------------------------------------------------

/**
 * Creates an ImageData-like object filled with a uniform RGBA color.
 * Brightness of a uniform gray pixel (r=g=b=v) is exactly `v`.
 */
function makeUniformImageData(width: number, height: number, r: number, g: number, b: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

/**
 * Creates a checkerboard pattern (alternating black and white pixels).
 * This produces very high Laplacian variance → high sharpness score.
 */
function makeCheckerboardImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isWhite = (x + y) % 2 === 0;
      const value = isWhite ? 255 : 0;
      const idx = (y * width + x) * 4;
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
      data[idx + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

/**
 * Creates a nearly-uniform image (very slight noise).
 * This produces near-zero Laplacian variance → very low sharpness score.
 */
function makeBlurryImageData(width: number, height: number, baseGray = 128): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    // Tiny ±1 variance — effectively flat/blurry
    const v = baseGray + (i % 3 === 0 ? 1 : 0);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

/**
 * Creates a checkerboard that alternates between `darkValue` and `lightValue`.
 * This gives a SHARP image (high Laplacian variance) with a tunable mean
 * brightness of (darkValue + lightValue) / 2, so we can test brightness
 * thresholds without accidentally triggering the blur check.
 *
 * Example: darkValue=0, lightValue=90  → mean ≈ 45 (dark-warning range)
 *          darkValue=195, lightValue=255 → mean ≈ 225 (bright-warning range)
 */
function makeTintedCheckerboardImageData(
  width: number,
  height: number,
  darkValue: number,
  lightValue: number
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isLight = (x + y) % 2 === 0;
      const v = isLight ? lightValue : darkValue;
      const idx = (y * width + x) * 4;
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

// ---------------------------------------------------------------------------
// validateImageResolution
// ---------------------------------------------------------------------------

test.describe("validateImageResolution", () => {
  test("returns no issues for a resolution well above the minimum", () => {
    const issues = validateImageResolution(1280, 960);
    expect(issues).toHaveLength(0);
  });

  test("returns a FAIL issue when both dimensions are below the hard minimum", () => {
    const issues = validateImageResolution(200, 150);
    const resolutionIssue = issues.find((i) => i.code === "LOW_RESOLUTION");
    expect(resolutionIssue).toBeDefined();
    expect(resolutionIssue?.severity).toBe("fail");
  });

  test("returns a WARNING issue when short side is between warning and fail thresholds", () => {
    // 360px short side is below 480 warn threshold but above 240 fail threshold
    const issues = validateImageResolution(640, 360);
    const resolutionIssue = issues.find((i) => i.code === "LOW_RESOLUTION");
    expect(resolutionIssue).toBeDefined();
    expect(resolutionIssue?.severity).toBe("warning");
  });

  test("returns no issues exactly at the warning threshold", () => {
    // Short side == MIN_RESOLUTION_WARN_PX (480) should pass
    const issues = validateImageResolution(640, 480);
    expect(issues).toHaveLength(0);
  });

  test("includes a human-readable message in the issue", () => {
    const issues = validateImageResolution(100, 80);
    expect(issues[0].message).toBeTruthy();
    expect(typeof issues[0].message).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// calculateBrightness
// ---------------------------------------------------------------------------

test.describe("calculateBrightness", () => {
  test("returns ~0 for a fully black image", () => {
    const imageData = makeUniformImageData(32, 32, 0, 0, 0);
    expect(calculateBrightness(imageData)).toBeCloseTo(0, 0);
  });

  test("returns ~255 for a fully white image", () => {
    const imageData = makeUniformImageData(32, 32, 255, 255, 255);
    expect(calculateBrightness(imageData)).toBeCloseTo(255, 0);
  });

  test("returns ~128 for a mid-gray image", () => {
    const imageData = makeUniformImageData(32, 32, 128, 128, 128);
    expect(calculateBrightness(imageData)).toBeCloseTo(128, 0);
  });

  test("weights RGB channels using ITU-R 601 luma coefficients", () => {
    // Pure red (255,0,0) → brightness ≈ 0.299 * 255 ≈ 76.2
    const redImage = makeUniformImageData(16, 16, 255, 0, 0);
    expect(calculateBrightness(redImage)).toBeCloseTo(76.2, 0);

    // Pure green (0,255,0) → brightness ≈ 0.587 * 255 ≈ 149.7
    const greenImage = makeUniformImageData(16, 16, 0, 255, 0);
    expect(calculateBrightness(greenImage)).toBeCloseTo(149.7, 0);
  });
});

// ---------------------------------------------------------------------------
// calculateSharpness
// ---------------------------------------------------------------------------

test.describe("calculateSharpness", () => {
  test("returns a high value for a high-contrast checkerboard image", () => {
    const imageData = makeCheckerboardImageData(64, 64);
    expect(calculateSharpness(imageData)).toBeGreaterThan(1000);
  });

  test("returns a very low value for a near-uniform blurry image", () => {
    const imageData = makeBlurryImageData(64, 64);
    expect(calculateSharpness(imageData)).toBeLessThan(10);
  });

  test("returns 0 for images too small to apply the Laplacian kernel", () => {
    const tiny = makeUniformImageData(2, 2, 128, 128, 128);
    expect(calculateSharpness(tiny)).toBe(0);
  });

  test("returns a non-negative number", () => {
    const imageData = makeUniformImageData(32, 32, 100, 100, 100);
    expect(calculateSharpness(imageData)).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// validateImageQuality — integration-level
// ---------------------------------------------------------------------------

test.describe("validateImageQuality", () => {
  test("returns status=pass and canProceed=true for a good image", () => {
    // 640x480, mid-gray (bright enough), checkerboard (sharp)
    const imageData = makeCheckerboardImageData(640, 480);
    const result: ImageQualityResult = validateImageQuality(imageData, 640, 480);

    expect(result.status).toBe("pass");
    expect(result.canProceed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test("returns status=fail and canProceed=false for an image below minimum resolution", () => {
    const imageData = makeCheckerboardImageData(200, 150);
    const result = validateImageQuality(imageData, 200, 150);

    expect(result.status).toBe("fail");
    expect(result.canProceed).toBe(false);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain("LOW_RESOLUTION");
  });

  test("returns status=fail and canProceed=false for a too-dark image", () => {
    // Brightness ~5 — well below dark-fail threshold (30)
    const imageData = makeUniformImageData(640, 480, 5, 5, 5);
    const result = validateImageQuality(imageData, 640, 480);

    expect(result.status).toBe("fail");
    expect(result.canProceed).toBe(false);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain("TOO_DARK");
  });

  test("returns a warning (not fail) for a moderately dark image", () => {
    // Brightness mean ≈ 45 (between dark-warn threshold 60 and dark-fail threshold 30).
    // Use a tinted checkerboard so sharpness is HIGH and does not also fail.
    // darkValue=0, lightValue=90 → mean = 45
    const imageData = makeTintedCheckerboardImageData(640, 480, 0, 90);
    const result = validateImageQuality(imageData, 640, 480);

    const darkIssue = result.issues.find((i) => i.code === "TOO_DARK");
    expect(darkIssue).toBeDefined();
    expect(darkIssue?.severity).toBe("warning");
    // canProceed is true since it's only a warning
    expect(result.canProceed).toBe(true);
    expect(result.status).toBe("warning");
  });

  test("returns a warning for a slightly over-bright image", () => {
    // Brightness mean ≈ 225 (between bright-warn threshold 220 and bright-fail threshold 240).
    // Use a tinted checkerboard so sharpness is HIGH and does not also fail.
    // darkValue=195, lightValue=255 → mean = 225
    const imageData = makeTintedCheckerboardImageData(640, 480, 195, 255);
    const result = validateImageQuality(imageData, 640, 480);

    const brightIssue = result.issues.find((i) => i.code === "TOO_BRIGHT");
    expect(brightIssue).toBeDefined();
    expect(brightIssue?.severity).toBe("warning");
    expect(result.canProceed).toBe(true);
  });

  test("returns status=fail and canProceed=false for an over-bright (blown-out) image", () => {
    // Brightness == 255 — above bright-fail threshold (240)
    const imageData = makeUniformImageData(640, 480, 255, 255, 255);
    const result = validateImageQuality(imageData, 640, 480);

    const brightIssue = result.issues.find((i) => i.code === "TOO_BRIGHT");
    expect(brightIssue?.severity).toBe("fail");
    expect(result.status).toBe("fail");
    expect(result.canProceed).toBe(false);
  });

  test("returns a BLURRY_IMAGE issue for a near-uniform blurry image", () => {
    const imageData = makeBlurryImageData(640, 480, 128);
    const result = validateImageQuality(imageData, 640, 480);

    const blurIssue = result.issues.find((i) => i.code === "BLURRY_IMAGE");
    expect(blurIssue).toBeDefined();
  });

  test("collects ALL detected issues, not just the first one", () => {
    // Low resolution + too dark — should report both issues
    const imageData = makeUniformImageData(200, 150, 5, 5, 5);
    const result = validateImageQuality(imageData, 200, 150);

    const codes = result.issues.map((i: ImageQualityIssue) => i.code);
    expect(codes).toContain("LOW_RESOLUTION");
    expect(codes).toContain("TOO_DARK");
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
  });

  test("canProceed is false when ANY issue has severity=fail", () => {
    // Only resolution fails, brightness is OK (warning only)
    const imageData = makeUniformImageData(200, 150, 45, 45, 45);
    const result = validateImageQuality(imageData, 200, 150);

    const hasFail = result.issues.some((i) => i.severity === "fail");
    expect(hasFail).toBe(true);
    expect(result.canProceed).toBe(false);
  });

  test("canProceed is true when only warning-level issues exist", () => {
    // Brightness mean ≈ 45: dark warning only (no fail).
    // tinted checkerboard keeps sharpness high so blur check does NOT fail.
    // Resolution is 640x480 which passes the resolution check.
    const imageData = makeTintedCheckerboardImageData(640, 480, 0, 90);
    const result = validateImageQuality(imageData, 640, 480);

    const hasFailSeverity = result.issues.some((i) => i.severity === "fail");
    expect(hasFailSeverity).toBe(false);
    expect(result.canProceed).toBe(true);
  });

  test("metrics contain correct width, height, brightness, and sharpness", () => {
    const imageData = makeCheckerboardImageData(640, 480);
    const result = validateImageQuality(imageData, 640, 480);

    expect(result.metrics.width).toBe(640);
    expect(result.metrics.height).toBe(480);
    expect(typeof result.metrics.brightness).toBe("number");
    expect(typeof result.metrics.sharpness).toBe("number");
    expect(result.metrics.brightness).toBeGreaterThanOrEqual(0);
    expect(result.metrics.sharpness).toBeGreaterThanOrEqual(0);
  });

  test("metrics.brightness matches calculateBrightness result", () => {
    const imageData = makeUniformImageData(64, 64, 100, 150, 80);
    const expectedBrightness = calculateBrightness(imageData);
    const result = validateImageQuality(imageData, 64, 64);
    expect(result.metrics.brightness).toBeCloseTo(expectedBrightness, 5);
  });

  test("metrics.sharpness matches calculateSharpness result", () => {
    const imageData = makeCheckerboardImageData(64, 64);
    const expectedSharpness = calculateSharpness(imageData);
    const result = validateImageQuality(imageData, 64, 64);
    expect(result.metrics.sharpness).toBeCloseTo(expectedSharpness, 5);
  });
});
