import { test, expect } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";
import { uploadSamplePhoto } from "./helpers/image";

test("online analysis uses MobileNetV3 ONNX and exposes model confidence metadata", async ({ page }) => {
  test.setTimeout(120_000);

  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });

  await page.goto("/inspect");
  await expect(page.getByRole("heading", { name: "Inspect" })).toBeVisible();
  await uploadSamplePhoto(page);
  await page.getByRole("button", { name: "Use Photo" }).click();

  const analyzeButton = page.getByRole("button", { name: /Analyze Sample|Preparing MobileNetV3/i });
  await expect(analyzeButton).toBeVisible();
  await expect(analyzeButton).toBeEnabled({ timeout: 60_000 });
  await analyzeButton.click();

  await expect(page.getByText(/Source:\s*MobileNetV3 ONNX/i)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Model confidence:/i)).toBeVisible();
  await expect(page.getByText(/Rules Fallback/i)).toHaveCount(0);
});

test("offline analysis allows rules-only fallback", async ({ context, page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });

  await page.goto("/inspect");
  await expect(page.getByRole("heading", { name: "Inspect" })).toBeVisible();
  await uploadSamplePhoto(page);
  await page.getByRole("button", { name: "Use Photo" }).click();
  await context.setOffline(true);
  const analyzeButton = page.getByRole("button", { name: /Analyze Sample|Preparing MobileNetV3/i });
  await expect(analyzeButton).toBeVisible();
  await expect(analyzeButton).toBeEnabled({ timeout: 30_000 });
  await analyzeButton.click();

  await expect(page.getByRole("heading", { name: "Classification" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Source:\s*MobileNetV3 ONNX/i)).toBeVisible();
  await expect(page.getByText(/Source:\s*Backend/i)).toHaveCount(0);
});
