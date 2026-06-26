/**
 * camera-quality-integration.spec.ts
 *
 * Tests for the ImageQualityResult integration in the CameraCapture UI.
 * Written BEFORE implementation (TDD).
 *
 * These are E2E-style Playwright tests that exercise the camera capture
 * component via the /inspect page. They mock validateImageQuality via
 * addInitScript so we can inject controlled quality outcomes without
 * needing a real camera or specific pixel values.
 *
 * Invariants under test:
 *   1. Good image → "Use Photo" is enabled, no quality banner shown.
 *   2. FAIL quality → "Use Photo" is disabled, error banner shown, retake only.
 *   3. WARNING quality → amber warning banner shown, both "Retake" and
 *      "Use Photo" remain available.
 *   4. Warning: clicking "Use Photo" still calls onCapture (proceeds to analyze).
 *   5. Fail: clicking "Use Photo" is blocked; only retake resets the flow.
 */

import { test, expect, type Page } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Installs a mock camera with a controllable canvas image.
 */
async function installMockCamera(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {},
      });
    }

    const getUserMediaMock = async (): Promise<MediaStream> => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#888888";
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(100, 100, 440, 280);
        ctx.fillStyle = "#444444";
        ctx.fillRect(200, 180, 240, 120);
      }
      const stream = canvas.captureStream(15);
      const track = stream.getVideoTracks()[0];
      Object.defineProperty(track, "getCapabilities", { configurable: true, value: () => ({}) });
      Object.defineProperty(track, "getSettings", { configurable: true, value: () => ({}) });
      Object.defineProperty(track, "applyConstraints", {
        configurable: true,
        value: async () => undefined,
      });
      return stream;
    };

    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: getUserMediaMock,
    });
  });
}

type QualityScenario = "pass" | "warning" | "fail";

/**
 * Patches window.__mockImageQualityResult so that CameraCapture reads the
 * controlled outcome (test seam — only active in test environments).
 *
 * Also patches window.__mockLegacyQualityAccepted to bypass the legacy
 * assessFileQuality meat-detection gate so the PNG test fixture is accepted.
 */
async function installQualityMock(page: Page, scenario: QualityScenario): Promise<void> {
  await page.addInitScript((s: QualityScenario) => {
    const results: Record<QualityScenario, object> = {
      pass: {
        status: "pass",
        issues: [],
        metrics: { width: 640, height: 480, brightness: 128, sharpness: 200 },
        canProceed: true,
      },
      warning: {
        status: "warning",
        issues: [
          {
            code: "TOO_DARK",
            message: "Image is underexposed (brightness 45.0). Consider improving lighting.",
            severity: "warning",
          },
        ],
        metrics: { width: 640, height: 480, brightness: 45, sharpness: 200 },
        canProceed: true,
      },
      fail: {
        status: "fail",
        issues: [
          {
            code: "LOW_RESOLUTION",
            message: "Image resolution is too low (200\u00d7150). Retake at higher resolution.",
            severity: "fail",
          },
          {
            code: "TOO_DARK",
            message: "Image is too dark (brightness 5.0). Improve lighting.",
            severity: "fail",
          },
        ],
        metrics: { width: 200, height: 150, brightness: 5, sharpness: 2 },
        canProceed: false,
      },
    };
    (window as Window & { __mockImageQualityResult?: object }).__mockImageQualityResult =
      results[s];
    // Allow any file through the legacy meat-detection gate in tests.
    (window as Window & { __mockLegacyQualityAccepted?: boolean }).__mockLegacyQualityAccepted =
      true;
  }, scenario);
}

/**
 * Uploads a file through the "Use Camera App" input.
 */
async function uploadViaCameraApp(page: Page): Promise<void> {
  const fileInput = page.locator('input[type="file"][capture="environment"]');
  await fileInput.setInputFiles("public/android-chrome-192x192.png");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Camera quality integration", () => {
  test("good quality: Use Photo is enabled and no quality banner is shown", async ({ page }) => {
    await installQualityMock(page, "pass");
    await seedSignedInSession(page, { userId: "user-1" });
    await mockCommonApi(page, { userId: "user-1" });

    await page.goto("/inspect");
    await uploadViaCameraApp(page);

    // The captured image should be displayed
    await expect(page.locator("img[alt='Captured']")).toBeVisible();

    // No quality warning banner
    await expect(page.getByTestId("quality-banner")).not.toBeVisible();

    // Use Photo button is enabled
    const usePhotoBtn = page.getByRole("button", { name: /use photo/i });
    await expect(usePhotoBtn).toBeEnabled();
  });

  test("warning quality: amber warning banner is shown but Use Photo remains enabled", async ({ page }) => {
    await installQualityMock(page, "warning");
    await seedSignedInSession(page, { userId: "user-1" });
    await mockCommonApi(page, { userId: "user-1" });

    await page.goto("/inspect");
    await uploadViaCameraApp(page);

    // Quality warning banner must be visible
    await expect(page.getByTestId("quality-banner")).toBeVisible();

    // Banner should indicate this is a warning
    await expect(page.getByTestId("quality-banner")).toContainText(/warning|quality|lighting/i);

    // Both action buttons are present and enabled
    await expect(page.getByRole("button", { name: /retake/i })).toBeEnabled();
    await expect(page.getByRole("button", { name: /use photo/i })).toBeEnabled();
  });

  test("warning quality: Use Photo proceeds to analyze step", async ({ page }) => {
    await installQualityMock(page, "warning");
    await seedSignedInSession(page, { userId: "user-1" });
    await mockCommonApi(page, { userId: "user-1" });

    await page.goto("/inspect");
    await uploadViaCameraApp(page);

    await expect(page.getByTestId("quality-banner")).toBeVisible();

    // Clicking Use Photo should accept the capture and show the analyze button
    await page.getByRole("button", { name: /use photo/i }).click();
    await expect(page.getByRole("button", { name: /analyze sample|preparing/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test("fail quality: Use Photo button is disabled and only Retake is actionable", async ({ page }) => {
    await installQualityMock(page, "fail");
    await seedSignedInSession(page, { userId: "user-1" });
    await mockCommonApi(page, { userId: "user-1" });

    await page.goto("/inspect");
    await uploadViaCameraApp(page);

    // Quality error banner must be visible
    await expect(page.getByTestId("quality-banner")).toBeVisible();

    // The banner should describe the failure
    await expect(page.getByTestId("quality-banner")).toContainText(
      /resolution|dark|blurry|bright|quality/i
    );

    // Use Photo should be disabled
    const usePhotoBtn = page.getByRole("button", { name: /use photo/i });
    await expect(usePhotoBtn).toBeDisabled();

    // Retake should remain enabled
    await expect(page.getByRole("button", { name: /retake/i })).toBeEnabled();
  });

  test("fail quality: clicking Retake clears the capture and hides the quality banner", async ({ page }) => {
    await installQualityMock(page, "fail");
    await seedSignedInSession(page, { userId: "user-1" });
    await mockCommonApi(page, { userId: "user-1" });

    await page.goto("/inspect");
    await uploadViaCameraApp(page);

    await expect(page.getByTestId("quality-banner")).toBeVisible();

    // Retake resets the UI
    await page.getByRole("button", { name: /retake/i }).click();

    // After retake, the captured image preview is gone and banner disappears
    await expect(page.locator("img[alt='Captured']")).not.toBeVisible();
    await expect(page.getByTestId("quality-banner")).not.toBeVisible();
  });

  test("fail quality: Analyze Sample button does not appear (inference blocked)", async ({ page }) => {
    await installQualityMock(page, "fail");
    await seedSignedInSession(page, { userId: "user-1" });
    await mockCommonApi(page, { userId: "user-1" });

    await page.goto("/inspect");
    await uploadViaCameraApp(page);

    // The Use Photo button must be disabled so onCapture is never called
    await expect(page.getByRole("button", { name: /use photo/i })).toBeDisabled();

    // Therefore the Analyze Sample button should not appear
    await expect(page.getByRole("button", { name: /analyze sample/i })).not.toBeVisible();
  });

  test("open camera path: quality banner appears after capture with warning result", async ({ page }) => {
    await installQualityMock(page, "warning");
    await installMockCamera(page);
    await seedSignedInSession(page, { userId: "user-1" });
    await mockCommonApi(page, { userId: "user-1" });

    await page.goto("/inspect");

    // Open camera and capture
    await page.getByRole("button", { name: /open camera/i }).click();
    await expect(page.getByRole("button", { name: /capture/i })).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /capture/i }).click();

    // After capture, the preview should appear
    await expect(page.locator("img[alt='Captured']")).toBeVisible({ timeout: 5_000 });

    // Quality banner should show for a warning result
    await expect(page.getByTestId("quality-banner")).toBeVisible({ timeout: 3_000 });
  });
});
