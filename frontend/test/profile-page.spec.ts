import { expect, test, type Page } from "@playwright/test";
import type { ApiSpy } from "./helpers/app";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";

async function openProfilePage(page: Page, spies: ApiSpy[] = []) {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" }, spies);
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: /my profile/i })).toBeVisible();
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
