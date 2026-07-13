import { expect, test, type Page } from "@playwright/test";
import type { ApiSpy } from "./helpers/app";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";

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

test("saves profile name and email from the Detailed Information card", async ({ page }) => {
  const spies: ApiSpy[] = [];

  await openProfilePage(page, spies);

  const detailsCard = page.getByTestId("profile-detailed-info-card");

  await expect(detailsCard.getByLabel(/^name$/i)).toHaveValue("Inspector");
  await expect(detailsCard.getByLabel(/^email$/i)).toHaveValue("inspector@example.com");
  await expect(detailsCard.getByRole("button", { name: /save profile/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /save profile/i })).toHaveCount(1);

  await detailsCard.getByLabel(/^name$/i).fill("Inspector Rivera");
  await detailsCard.getByLabel(/^email$/i).fill("rivera@example.com");
  await detailsCard.getByRole("button", { name: /save profile/i }).click();

  await expect.poll(
    () =>
      spies.filter(
        (spy) =>
          spy.method === "PUT" &&
          spy.url.endsWith("/api/profiles/user-1") &&
          spy.postData.includes('"full_name":"Inspector Rivera"'),
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

test("renders the approved desktop grouping for profile sections", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openProfilePage(page);

  const primaryColumn = page.getByTestId("profile-primary-column");
  const secondaryColumn = page.getByTestId("profile-secondary-column");

  await expect(primaryColumn.getByRole("heading", { name: "Detailed Information" })).toBeVisible();
  await expect(primaryColumn.getByRole("heading", { name: "Password Reset Section" })).toBeVisible();
  await expect(
    primaryColumn.getByRole("heading", { name: "Passkeys and Device Unlock" }),
  ).toBeVisible();
  await expect(primaryColumn.getByRole("heading", { name: "Tutorials" })).toBeVisible();

  await expect(secondaryColumn.getByRole("heading", { name: "Actions" })).toBeVisible();
  await expect(
    secondaryColumn.getByRole("heading", { name: "Terms and Conditions Reminder" }),
  ).toBeVisible();
  await expect(secondaryColumn.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();

  const primaryBox = await primaryColumn.boundingBox();
  const secondaryBox = await secondaryColumn.boundingBox();

  expect(primaryBox).not.toBeNull();
  expect(secondaryBox).not.toBeNull();
  expect((primaryBox?.x ?? 0) + 40).toBeLessThan(secondaryBox?.x ?? 0);
});

test("renders the approved mobile section order", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openProfilePage(page);

  const orderedIds = [
    "profile-detailed-info-card",
    "profile-password-card",
    "profile-passkeys-card",
    "profile-tutorials-card",
    "profile-actions-card",
    "profile-terms-card",
    "profile-policy-card",
  ] as const;

  const topPositions = [];
  for (const testId of orderedIds) {
    topPositions.push(await getTop(page, testId));
  }

  expect(topPositions).toEqual([...topPositions].sort((left, right) => left - right));
});
