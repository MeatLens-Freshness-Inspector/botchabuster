import { test, expect } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";

test("moves the confidence summary into a full-width mobile row", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });

  await page.goto("/history");

  const layout = page.getByTestId("inspection-card-layout").first();
  const metrics = page.getByTestId("inspection-metrics").first();

  await expect(layout).toBeVisible();
  await expect(metrics).toBeVisible();

  const layoutClassName = (await layout.getAttribute("class")) ?? "";
  const metricsClassName = (await metrics.getAttribute("class")) ?? "";

  expect(layoutClassName).toContain("grid-cols-[auto_minmax(0,1fr)]");
  expect(layoutClassName).toContain("sm:grid-cols-[auto_minmax(0,1fr)_auto]");
  expect(metricsClassName).toContain("col-span-2");
  expect(metricsClassName).toContain("sm:col-span-1");
});

test("renders inline GPS coordinates in history cards", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });
  await page.route("**/api/inspections**", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    const inspectionCreatedAt = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "inspection-1",
          user_id: "user-1",
          meat_type: "pork",
          classification: "fresh",
          confidence_score: 95,
          flagged_deviations: [],
          explanation: "Looks fresh",
          image_url: null,
          location: "North Market",
          location_latitude: 14.5995,
          location_longitude: 120.9842,
          inspector_notes: null,
          created_at: inspectionCreatedAt,
          updated_at: inspectionCreatedAt,
        },
      ]),
    });
  });

  await page.goto("/history");

  await expect(
    page.getByText("North Market | Lat: 14.599500 | Long: 120.984200", { exact: true }),
  ).toBeVisible();
});
