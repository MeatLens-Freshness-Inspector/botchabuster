import { test, expect, type Page } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "./support/app";
import { uploadSamplePhoto } from "./support/image";

async function completePreScanChecklist(page: Page): Promise<void> {
  await page.getByLabel(/stall number/i).fill("12-A");
  await page.getByLabel(/meat inspection certificate proof/i).fill("CERT-77");
  await page.getByLabel(/meat expiry date|expiry of meat/i).fill("2026-07-10");
  await page.getByLabel(/storage correct/i).selectOption("yes");
  await page.getByLabel(/light color correct/i).selectOption("yes");
  await page.getByLabel(/area clean/i).selectOption("yes");
}

test("hides technical metric sections when detailed results are disabled", async ({ context, page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1", showDetailedResults: false });
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

  await page.goto("/inspect");
  await completePreScanChecklist(page);
  await context.setOffline(true);
  await uploadSamplePhoto(page);
  await page.getByRole("button", { name: "Use Photo" }).click();

  await expect(page.getByRole("heading", { name: "Classification" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Confidence/i).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Analysis", exact: true })).toBeVisible();

  await expect(page.getByText(/Flagged Deviations/i, { exact: true })).toHaveCount(0);
});

test("shows Ensemble as the result source when analysis_source is ensemble", async ({ context, page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1", showDetailedResults: true });
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
      confidence_score: 86,
      model_confidence_score: 0.864975,
      rule_confidence_score: null,
      freshness_score: 93,
      recommendation: "Good for Consumption",
      probabilities: {
        fresh: 0.75,
        acceptable: 0.09,
        warning: 0.02,
        "not fresh": 0.08,
        spoiled: 0.06,
      },
      label_order: ["fresh", "acceptable", "warning", "not fresh", "spoiled"],
      flagged_deviations: [],
      explanation: "Mock inspection analysis",
      analysis_source: "ensemble",
      model_path: "MobileNetV3-small seed123/model2 + ResNet50",
    };
  });

  await page.goto("/inspect");
  await completePreScanChecklist(page);
  await context.setOffline(true);
  await uploadSamplePhoto(page);
  await page.getByRole("button", { name: "Use Photo" }).click();

  await expect(page.getByText(/Source:\s*Ensemble/i)).toBeVisible({ timeout: 30_000 });
});
