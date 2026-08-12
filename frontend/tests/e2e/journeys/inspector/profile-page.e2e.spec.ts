import { expect, test, type Page } from "@playwright/test";
import type { ApiSpy } from "../../../support/fixtures/app";
import { mockCommonApi, seedSignedInSession } from "../../../support/fixtures/app";

async function openProfilePage(page: Page, spies: ApiSpy[] = []) {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" }, spies);
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: /my profile/i })).toBeVisible();
}

async function getTop(page: Page, testId: string) {
  const box = await page.getByTestId(testId).boundingBox();
  if (!box) {
    throw new Error(`Missing bounding box for ${testId}`);
  }

  return box.y;
}

test("loads the profile page without repeatedly refetching profile state", async ({ page }) => {
  const spies: ApiSpy[] = [];

  await openProfilePage(page, spies);

  const settledProfileLoadCount = spies.filter(
    (spy) =>
      spy.method === "GET" &&
      spy.url.endsWith("/api/profiles/user-1"),
  ).length;

  await page.waitForTimeout(750);

  const profileLoadRequests = spies.filter(
    (spy) =>
      spy.method === "GET" &&
      spy.url.endsWith("/api/profiles/user-1"),
  );

  expect(profileLoadRequests.length).toBeLessThanOrEqual(2);
  expect(profileLoadRequests).toHaveLength(settledProfileLoadCount);
});

test("does not render a back button on the main profile page", async ({ page }) => {
  await openProfilePage(page);

  await expect(page.getByRole("button", { name: /go back/i })).toHaveCount(0);
});

test("keeps the signed-in session intact when server-side sign-out fails", async ({ page }) => {
  const spies: ApiSpy[] = [];

  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" }, spies);

  await page.route("**/api/auth/sign-out", async (route) => {
    const request = route.request();
    spies.push({
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      postData: request.postData() ?? "",
    });

    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Sign-out failed" }),
    });
  });

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: /my profile/i })).toBeVisible();

  await page.getByRole("button", { name: /^sign out$/i }).first().click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("alertdialog").getByRole("button", { name: /^sign out$/i }).click();

  await expect.poll(() => spies.filter((spy) => spy.url.endsWith("/api/auth/sign-out")).length).toBe(1);

  const signOutRequest = spies.find((spy) => spy.url.endsWith("/api/auth/sign-out"));
  expect(signOutRequest?.headers["x-csrf-token"]).toBe("mock-csrf-token");
  expect(signOutRequest?.headers.authorization).toBe("Bearer session-token");

  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText(/failed to sign out/i)).toBeVisible();

  const authState = await page.evaluate(() => ({
    user: window.localStorage.getItem("meatlens-auth-user"),
    session: window.sessionStorage.getItem("meatlens-auth-session"),
  }));
  expect(authState.user).toContain("user-1");
  expect(authState.session).toContain("session-token");
});

test("saves all editable details from the Detailed Information card", async ({ page }) => {
  const spies: ApiSpy[] = [];

  await openProfilePage(page, spies);

  const detailsCard = page.getByTestId("profile-detailed-info-card");

  await expect(detailsCard.getByLabel(/^name$/i)).toHaveValue("Inspector");
  await expect(detailsCard.getByLabel(/^email$/i)).toHaveValue("inspector@example.com");
  await expect(detailsCard.getByLabel(/^location$/i)).toHaveValue("North Market");
  await expect(detailsCard.getByText("Inspector Code", { exact: true })).toHaveCount(0);
  await expect(detailsCard.getByRole("button", { name: /save profile/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /save profile/i })).toHaveCount(1);

  await detailsCard.getByLabel(/^name$/i).fill("Inspector Rivera");
  await detailsCard.getByLabel(/^email$/i).fill("rivera@example.com");
  await detailsCard.getByLabel(/^location$/i).fill("Central Market");
  await detailsCard.getByRole("combobox").click();
  await page.getByRole("option", { name: "DTI" }).click();
  await detailsCard.getByRole("button", { name: /save profile/i }).click();

  await expect.poll(
    () =>
      spies.filter(
        (spy) =>
          spy.method === "PUT" &&
          spy.url.endsWith("/api/profiles/user-1") &&
          spy.postData.includes('"full_name":"Inspector Rivera"') &&
          spy.postData.includes('"location":"Central Market"') &&
          spy.postData.includes('"report_organization":"dti"') &&
          !spy.postData.includes("inspector_code"),
      ).length,
  ).toBe(1);

  await expect.poll(
    () =>
      spies.filter(
        (spy) =>
          spy.method === "PATCH" &&
          spy.url.endsWith("/api/auth/users/user-1/email") &&
          spy.postData.includes('"email":"rivera@example.com"'),
      ).length,
  ).toBe(1);
});

test("applies theme and inspect detail preferences immediately", async ({ page }) => {
  const spies: ApiSpy[] = [];

  await openProfilePage(page, spies);
  const preferencesCard = page.getByTestId("profile-preferences-account-card");

  await preferencesCard.getByRole("switch", { name: "Use light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(
    () => spies.filter(
      (spy) => spy.method === "PUT" && spy.postData === JSON.stringify({ is_dark_mode: true }),
    ).length,
  ).toBe(1);

  await preferencesCard.getByRole("switch", { name: "Show detailed inspect results" }).click();
  await expect(preferencesCard.getByText("Simplified")).toBeVisible();
  await expect.poll(
    () => spies.filter(
      (spy) => spy.method === "PUT" && spy.postData === JSON.stringify({ show_detailed_results: false }),
    ).length,
  ).toBe(1);
});

test("changes the password with current, new, and confirmation fields", async ({ page }) => {
  const spies: ApiSpy[] = [];

  await openProfilePage(page, spies);
  const detailsCard = page.getByTestId("profile-detailed-info-card");

  await detailsCard.getByRole("button", { name: "Change Password" }).click();
  const passwordDialog = page.getByRole("dialog");
  await expect(passwordDialog).toBeVisible();

  await passwordDialog.getByLabel("Current password").fill("old-password");
  await passwordDialog.getByLabel("New password", { exact: true }).fill("new-password-123");
  await passwordDialog.getByLabel("Confirm new password").fill("new-password-123");
  await passwordDialog.getByRole("button", { name: "Change Password" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Are you sure");
  await page.getByRole("alertdialog").getByRole("button", { name: "Change Password" }).click();

  await expect.poll(
    () => spies.filter((spy) => spy.method === "PATCH" && spy.url.endsWith("/api/auth/users/user-1/password")).length,
  ).toBe(1);

  const passwordRequest = spies.find((spy) => spy.url.endsWith("/api/auth/users/user-1/password"));
  expect(passwordRequest?.postData).toBe(JSON.stringify({
    currentPassword: "old-password",
    newPassword: "new-password-123",
  }));
  await expect(passwordDialog).toContainText("Password changed successfully");
});

test("does not submit a password when confirmation does not match", async ({ page }) => {
  const spies: ApiSpy[] = [];

  await openProfilePage(page, spies);
  const detailsCard = page.getByTestId("profile-detailed-info-card");
  await detailsCard.getByRole("button", { name: "Change Password" }).click();
  const passwordDialog = page.getByRole("dialog");

  await passwordDialog.getByLabel("Current password").fill("old-password");
  await passwordDialog.getByLabel("New password", { exact: true }).fill("new-password-123");
  await passwordDialog.getByLabel("Confirm new password").fill("different-password");
  await passwordDialog.getByRole("button", { name: "Change Password" }).click();

  await page.waitForTimeout(250);
  expect(spies.filter((spy) => spy.url.endsWith("/api/auth/users/user-1/password"))).toHaveLength(0);
  await expect(passwordDialog.getByText("New passwords do not match")).toBeVisible();
});

test("renders the approved desktop grouping for profile sections", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openProfilePage(page);

  const primaryColumn = page.getByTestId("profile-primary-column");
  const secondaryColumn = page.getByTestId("profile-secondary-column");

  await expect(primaryColumn.getByRole("heading", { name: "Detailed Information" })).toBeVisible();
  await expect(
    primaryColumn.getByRole("heading", { name: "Passkeys and Device Unlock" }),
  ).toBeVisible();
  await expect(primaryColumn.getByRole("heading", { name: "Tutorials" })).toBeVisible();

  await expect(secondaryColumn.getByRole("heading", { name: "Preferences and Account" })).toBeVisible();
  await expect(
    secondaryColumn.getByRole("heading", { name: "Legal" }),
  ).toBeVisible();
  await expect(secondaryColumn.getByRole("button", { name: "View Privacy Policy" })).toBeVisible();

  const detailedBox = await page.getByTestId("profile-detailed-info-card").boundingBox();
  const preferencesBox = await page.getByTestId("profile-preferences-account-card").boundingBox();
  const passkeysBox = await page.getByTestId("profile-passkeys-card").boundingBox();
  const legalBox = await page.getByTestId("profile-legal-card").boundingBox();

  expect(detailedBox).not.toBeNull();
  expect(preferencesBox).not.toBeNull();
  expect((detailedBox?.x ?? 0) + 40).toBeLessThan(preferencesBox?.x ?? 0);
  expect(detailedBox?.height).toBe(preferencesBox?.height);
  expect(passkeysBox).not.toBeNull();
  expect(legalBox).not.toBeNull();
  expect((passkeysBox?.x ?? 0) + 40).toBeLessThan(legalBox?.x ?? 0);
  expect(passkeysBox?.height).toBe(legalBox?.height);
  expect(legalBox?.y ?? 0).toBeGreaterThanOrEqual(
    (preferencesBox?.y ?? 0) + (preferencesBox?.height ?? 0) + 16,
  );
});

test("renders the approved mobile section order", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openProfilePage(page);

  const orderedIds = [
    "profile-detailed-info-card",
    "profile-passkeys-card",
    "profile-tutorials-card",
    "profile-legal-card",
    "profile-preferences-account-card",
  ] as const;

  const topPositions = [];
  for (const testId of orderedIds) {
    topPositions.push(await getTop(page, testId));
  }

  expect(topPositions).toEqual([...topPositions].sort((left, right) => left - right));

  const changePasswordBox = await page.getByRole("button", { name: "Change Password" }).boundingBox();
  const saveProfileBox = await page.getByRole("button", { name: "Save Profile" }).boundingBox();
  expect(changePasswordBox?.y).toBe(saveProfileBox?.y);

  const resultsBox = await page.getByTestId("profile-results-preference").boundingBox();
  const signOutBox = await page.getByTestId("profile-sign-out-button").boundingBox();
  expect(signOutBox?.y ?? 0).toBeGreaterThanOrEqual((resultsBox?.y ?? 0) + (resultsBox?.height ?? 0) + 12);
});
