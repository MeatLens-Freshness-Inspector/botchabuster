import { test, expect } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";
import { uploadSamplePhoto } from "./helpers/image";

test("prevents saving the same analyzed record more than once", async ({ page }) => {
  test.setTimeout(120_000);

  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });
  await page.addInitScript(() => {
    (window as Window & { __mockLegacyQualityAccepted?: boolean }).__mockLegacyQualityAccepted = true;
    (window as Window & { __mockImageQualityResult?: object }).__mockImageQualityResult = {
      status: "pass",
      issues: [],
      metrics: { width: 640, height: 480, brightness: 128, sharpness: 200 },
      canProceed: true,
    };
    (window as Window & { __mockOfflineAnalysisResult?: object }).__mockOfflineAnalysisResult = {
      classification: "fresh",
      confidence_score: 95,
      model_confidence_score: 95,
      rule_confidence_score: null,
      freshness_score: 95,
      recommendation: "Good for Consumption",
      probabilities: {
        fresh: 0.95,
        acceptable: 0.05,
      },
      label_order: ["fresh", "acceptable", "warning", "not fresh", "spoiled"],
      flagged_deviations: [],
      explanation: "Mock inspection analysis",
      analysis_source: "mobilenetv3",
      model_path: "mock-model.onnx",
    };
  });

  let uploadCalls = 0;
  let createCalls = 0;
  let createPayload = "";
  await page.route("**/api/upload/inspection-image", async (route) => {
    uploadCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ imageUrl: "https://example.com/sample.jpg" }),
    });
  });

  await page.route("**/api/inspections", async (route) => {
    if (route.request().method() === "POST") {
      createCalls += 1;
      createPayload = route.request().postData() ?? "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "inspection-1" }),
      });
      return;
    }
    await route.fallback();
  });

  await page.goto("/inspect");
  await uploadSamplePhoto(page);
  await page.getByRole("button", { name: "Use Photo" }).click();
  await expect.poll(() => uploadCalls).toBe(1);
  await expect.poll(() => createCalls).toBe(1);
  expect(JSON.parse(createPayload)).toMatchObject({ location: "Old Market" });
  await expect(page.getByRole("button", { name: "Record Saved" })).toBeDisabled();
});

test("captures GPS coordinates in real time and sends them with the inspection save payload", async ({ page }) => {
  test.setTimeout(120_000);

  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });
  await page.addInitScript(() => {
    (window as Window & { __mockLegacyQualityAccepted?: boolean }).__mockLegacyQualityAccepted = true;
    (window as Window & { __mockImageQualityResult?: object }).__mockImageQualityResult = {
      status: "pass",
      issues: [],
      metrics: { width: 640, height: 480, brightness: 128, sharpness: 200 },
      canProceed: true,
    };
    (window as Window & { __mockOfflineAnalysisResult?: object }).__mockOfflineAnalysisResult = {
      classification: "fresh",
      confidence_score: 95,
      model_confidence_score: 95,
      rule_confidence_score: null,
      freshness_score: 95,
      recommendation: "Good for Consumption",
      probabilities: {
        fresh: 0.95,
        acceptable: 0.05,
      },
      label_order: ["fresh", "acceptable", "warning", "not fresh", "spoiled"],
      flagged_deviations: [],
      explanation: "Mock inspection analysis",
      analysis_source: "mobilenetv3",
      model_path: "mock-model.onnx",
    };
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(success: PositionCallback) {
          success({
            coords: {
              latitude: 14.5995,
              longitude: 120.9842,
              accuracy: 5,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON() {
                return {};
              },
            },
            timestamp: Date.now(),
            toJSON() {
              return {};
            },
          } as GeolocationPosition);
        },
        watchPosition() {
          return 1;
        },
        clearWatch() {},
      },
    });
  });

  let createPayload = "";
  await page.route("**/api/inspections", async (route) => {
    if (route.request().method() === "POST") {
      createPayload = route.request().postData() ?? "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "inspection-1" }),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto("/inspect");
  await expect(
    page.getByText(/Manual location is saved, and real-time GPS coordinates are captured when available/i),
  ).toBeVisible();

  await uploadSamplePhoto(page);
  await page.getByRole("button", { name: "Use Photo" }).click();
  await expect(page.getByText("Old Market (14.599500, 120.984200)", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record Saved" })).toBeDisabled();

  expect(JSON.parse(createPayload)).toMatchObject({
    location: "Old Market",
    location_latitude: 14.5995,
    location_longitude: 120.9842,
  });
});
