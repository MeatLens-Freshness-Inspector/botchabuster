import { test, expect } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";

const adminInspections = [
  {
    id: "inspection-1",
    user_id: "admin-1",
    meat_type: "beef",
    classification: "fresh",
    confidence_score: 93,
    flagged_deviations: [],
    explanation: null,
    image_url: null,
    location: "North Market",
    inspector_notes: null,
    created_at: "2026-04-14T08:00:00.000Z",
    updated_at: "2026-04-14T08:00:00.000Z",
  },
  {
    id: "inspection-2",
    user_id: "user-2",
    meat_type: "fish",
    classification: "spoiled",
    confidence_score: 76,
    flagged_deviations: [],
    explanation: null,
    image_url: null,
    location: "",
    inspector_notes: null,
    created_at: "2026-04-13T08:00:00.000Z",
    updated_at: "2026-04-13T08:00:00.000Z",
  },
  {
    id: "inspection-3",
    user_id: null,
    meat_type: "pork",
    classification: "warning",
    confidence_score: 82,
    flagged_deviations: [],
    explanation: null,
    image_url: null,
    location: null,
    inspector_notes: null,
    created_at: "2026-04-12T08:00:00.000Z",
    updated_at: "2026-04-12T08:00:00.000Z",
  },
];

test("renders the expanded business analytics section with fallback labels", async ({ page }) => {
  let inspectionUrl = "";

  await seedSignedInSession(page, { userId: "admin-1", isAdmin: true });
  await mockCommonApi(page, { userId: "admin-1", isAdmin: true });

  await page.route("**/api/inspections?**", async (route) => {
    inspectionUrl = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(adminInspections),
    });
  });

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("button", { name: /^Reports$/i }).click();
  await expect(page.getByText(/Generate Reports/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /PDF Summary/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /CSV Detail/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /JSON Snapshot/i })).toBeVisible();
  await page.getByRole("button", { name: /^Overview$/i }).click();
  await expect(page.getByText(/Business Analytics/i)).toBeVisible();
  await expect.poll(() => inspectionUrl).not.toBe("");
  expect(inspectionUrl).toContain("limit=200");
  expect(inspectionUrl).toContain("offset=0");
  expect(inspectionUrl).toContain("scope=all");
  await expect(page.getByText(/Top inspectors by inspection volume/i)).toBeVisible();
  await expect(page.getByText(/Average confidence by inspector/i)).toBeVisible();
  await expect(page.getByText(/Inspections by meat type/i)).toBeVisible();
  await expect(page.getByText(/Spoiled rate by meat type/i)).toBeVisible();
  await expect(page.getByText(/Top locations by inspection count/i)).toBeVisible();
  await expect(page.getByText(/Spoiled share by location/i)).toBeVisible();
  await expect(page.getByText(/Average confidence trend/i)).toBeVisible();
  await expect(page.getByText(/Freshness mix by day/i)).toBeVisible();
  await expect(page.getByText(/Unspecified/i).first()).toBeVisible();
});

test("admin can assign report header organizations when creating and editing users", async ({ page }) => {
  await seedSignedInSession(page, { userId: "admin-1", isAdmin: true });
  await mockCommonApi(page, { userId: "admin-1", isAdmin: true });

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("button", { name: /^Users$/i }).click();
  await expect(page.getByText(/Add User/i)).toBeVisible();

  await page.getByPlaceholder("inspector@example.com").fill("new.user@example.com");
  await page.getByPlaceholder("At least 6 characters").fill("hunter22");
  await page.getByLabel("Report header organization").click();
  await page.getByRole("option", { name: "DTI" }).click();
  await page.getByRole("button", { name: /Create User/i }).click();

  const newUserCard = page.locator("div.rounded-2xl").filter({ hasText: "new.user@example.com" }).first();
  await expect(newUserCard).toContainText(/Report Header:\s*DTI/i);

  const blairCard = page.locator("div.rounded-2xl").filter({ hasText: "blair@example.com" }).first();
  await blairCard.getByRole("button", { name: /^Edit$/i }).click();
  await page.getByLabel("Report header organization").click();
  await page.getByRole("option", { name: "City Veterinary Office of Olongapo" }).click();
  await page.getByRole("button", { name: /Save Changes/i }).click();

  await expect(blairCard).toContainText(
    /Report Header:\s*City Veterinary Office of Olongapo/i,
  );
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("renders analytics successfully in mobile viewport", async ({ page }) => {
    await seedSignedInSession(page, { userId: "admin-1", isAdmin: true });
    await mockCommonApi(page, { userId: "admin-1", isAdmin: true });

    await page.route("**/api/inspections?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(adminInspections),
      });
    });

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole("button", { name: /^Overview$/i }).click();
    await page.getByRole("menuitem", { name: /^Reports$/i }).click();
    await expect(page.getByText(/Generate Reports/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /PDF Summary/i })).toBeVisible();
    await page.getByRole("button", { name: /^Reports$/i }).click();
    await page.getByRole("menuitem", { name: /^Overview$/i }).click();
    await expect(page.getByText(/Business Analytics/i)).toBeVisible();
    await expect(page.getByText(/Top inspectors by inspection volume/i)).toBeVisible();
    await expect(page.getByText(/Top locations by inspection count/i)).toBeVisible();
  });
});
