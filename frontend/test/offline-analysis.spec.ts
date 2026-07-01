import { test, expect, type Page } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";
import { uploadSamplePhoto } from "./helpers/image";

async function completePreScanChecklist(page: Page) {
  await page.getByLabel(/stall number/i).fill("12-A");
  await page.getByLabel(/meat inspection certificate proof/i).fill("CERT-77");
  await page.getByLabel(/meat expiry date|expiry of meat/i).fill("2026-07-10");
  await page.getByLabel(/storage correct/i).selectOption("yes");
  await page.getByLabel(/light color correct/i).selectOption("yes");
  await page.getByLabel(/area clean/i).selectOption("yes");
}

async function installMockQualityGate(page: Page) {
  await page.addInitScript(() => {
    (window as Window & { __mockLegacyQualityAccepted?: boolean }).__mockLegacyQualityAccepted = true;
    (window as Window & { __mockImageQualityResult?: object }).__mockImageQualityResult = {
      status: "pass",
      issues: [],
      metrics: { width: 640, height: 480, brightness: 128, sharpness: 200 },
      canProceed: true,
    };
  });
}

async function seedMockOfflineAnalysisResult(page: Page) {
  await page.addInitScript(() => {
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
}

test("online analysis uses MobileNetV3 ONNX and exposes model confidence metadata", async ({ page }) => {
  test.setTimeout(120_000);

  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });
  await installMockQualityGate(page);
  await seedMockOfflineAnalysisResult(page);

  await page.goto("/inspect");
  await expect(page.getByRole("heading", { name: "Inspect" })).toBeVisible();
  await completePreScanChecklist(page);
  await uploadSamplePhoto(page);
  await page.getByRole("button", { name: "Use Photo" }).click();

  await expect(page.getByText(/Source:\s*MobileNetV3 ONNX/i)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Model confidence:/i)).toBeVisible();
  await expect(page.getByText(/Rules Fallback/i)).toHaveCount(0);
});

test("offline analysis allows rules-only fallback", async ({ context, page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });
  await installMockQualityGate(page);
  await seedMockOfflineAnalysisResult(page);

  await page.goto("/inspect");
  await expect(page.getByRole("heading", { name: "Inspect" })).toBeVisible();
  await completePreScanChecklist(page);
  await context.setOffline(true);
  await uploadSamplePhoto(page);
  await page.getByRole("button", { name: "Use Photo" }).click();

  await expect(page.getByText(/Source:\s*MobileNetV3 ONNX/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Source:\s*Backend/i)).toHaveCount(0);
});

test("offline protocol failure queues a spoiled protocol result without AI analysis", async ({ context, page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });
  await installMockQualityGate(page);

  await page.goto("/inspect");
  await page.getByLabel(/stall number/i).fill("12-A");
  await page.getByLabel(/meat inspection certificate proof/i).fill("CERT-77");
  await page.getByLabel(/meat expiry date|expiry of meat/i).fill("2026-07-10");
  await page.getByLabel(/storage correct/i).selectOption("no");
  await page.getByLabel(/light color correct/i).selectOption("yes");
  await page.getByLabel(/area clean/i).selectOption("yes");

  await context.setOffline(true);
  await uploadSamplePhoto(page);
  await page.getByRole("button", { name: "Use Photo" }).click();

  await expect(page.getByText(/protocol result: spoiled/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Analyze Sample/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Queued for Sync" })).toBeDisabled({ timeout: 15_000 });

  const queuedScan = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("meatlens-offline");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const scan = await new Promise<Record<string, unknown> | null>((resolve, reject) => {
      const tx = db.transaction("pending-scans", "readonly");
      const request = tx.objectStore("pending-scans").getAll();
      request.onsuccess = () => resolve((request.result as Record<string, unknown>[])[0] ?? null);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return scan;
  });

  expect(queuedScan).toMatchObject({
    stallNumber: "12-A",
    meatInspectionCertificateProof: "CERT-77",
    meatExpiryDate: "2026-07-10",
    storageCorrect: false,
    lightColorCorrect: true,
    lightColorObserved: null,
    areaClean: true,
    inspectionDecisionSource: "protocol_pre_scan",
    protocolSpoiledReason: "failed_pre_scan_safety_protocol",
    analysisResult: {
      classification: "spoiled",
      confidence_score: 100,
    },
  });
});
