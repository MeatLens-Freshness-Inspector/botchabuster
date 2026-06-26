import { expect, test } from "@playwright/test";
import type { ApiSpy } from "./helpers/app";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";

test("loads the profile page without repeatedly refetching profile state", async ({ page }) => {
  const spies: ApiSpy[] = [];

  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" }, spies);

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: /my profile/i })).toBeVisible();

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
