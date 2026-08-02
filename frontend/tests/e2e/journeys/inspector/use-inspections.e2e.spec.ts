import { test, expect } from "@playwright/test";
import {
  mockCommonApi,
  seedInspectionHistoryCache,
  seedSignedInSession,
  type ApiSpy,
} from "../../../support/fixtures/app";

test("signed-in history fetches inspections scoped to the current user", async ({ page }) => {
  const spies: ApiSpy[] = [];
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" }, spies);

  await page.goto("/history");
  await expect(page).toHaveURL(/\/history$/);
  await expect.poll(() => spies.find((spy) => spy.url.includes("/api/inspections?"))).toBeTruthy();

  const inspectionRequest = spies.find((spy) => spy.url.includes("/api/inspections?"));
  expect(inspectionRequest).toBeTruthy();
  expect(inspectionRequest?.url).toContain("limit=50");
  expect(inspectionRequest?.url).toContain("offset=0");
  expect(inspectionRequest?.url).toContain("scope=mine");
});

test("history query does not run when no user is signed in", async ({ page }) => {
  let inspectionCalls = 0;

  await page.route("**/api/analysis/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok" }),
    });
  });

  await page.route("**/api/inspections?**", async (route) => {
    inspectionCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.goto("/history");
  await page.waitForURL("**/login");
  expect(inspectionCalls).toBe(0);
});

test("history renders cached inspections when opened offline", async ({ context, page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });
  const now = new Date().toISOString();
  await seedInspectionHistoryCache(page, {
    userId: "user-1",
    inspections: [
      {
        id: "inspection-offline-1",
        user_id: "user-1",
        meat_type: "pork",
        classification: "warning",
        confidence_score: 88,
        flagged_deviations: ["Surface moisture"],
        explanation: "Cached inspection history entry",
        image_url: null,
        location: "North Market",
        location_latitude: null,
        location_longitude: null,
        stall_number: "12-A",
        meat_inspection_certificate_proof: null,
        meat_expiry_date: null,
        storage_correct: null,
        light_color_correct: null,
        light_color_observed: null,
        area_clean: null,
        inspection_decision_source: "ai",
        protocol_spoiled_reason: null,
        inspector_notes: null,
        captured_at: now,
        created_at: now,
        updated_at: now,
      },
    ],
  });

  await page.goto("/inspect");
  await expect(page.getByRole("heading", { name: "Inspect" })).toBeVisible();
  await page.unroute("**/api/**");
  await context.setOffline(true);
  await expect(page.getByText(/You're offline/i)).toBeVisible();
  await page.getByRole("link", { name: "History" }).click();

  await expect(page).toHaveURL(/\/history$/);
  const cachedInspectionCard = page.getByTestId("inspection-card-layout").first();
  await expect(cachedInspectionCard).toContainText("North Market");
  await expect(cachedInspectionCard).toContainText("88%");
});
