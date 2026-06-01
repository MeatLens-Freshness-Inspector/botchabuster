import { expect, test, type Page } from "@playwright/test";
import type { ApiSpy } from "./helpers/app";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";

async function completeHelpReplay(page: Page): Promise<void> {
  await page.getByRole("button", { name: /choose market/i }).click();
  await page.getByRole("button", { name: /open capture/i }).click();
  await page.getByRole("button", { name: /run analysis/i }).click();
  await page.getByRole("button", { name: /save result/i }).click();
}

test("shows a Help entry in inspector profile and opens the help hub", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });

  await page.goto("/profile");
  await page.getByRole("button", { name: /open help tutorials/i }).click();

  await expect(page).toHaveURL(/\/profile\/help$/);
  await expect(page.getByRole("heading", { name: /help tutorials/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /inspect demo/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /history demo/i })).toBeVisible();
});

test("replays help demos independently without writing onboarding completion", async ({ page }) => {
  const spies: ApiSpy[] = [];

  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(
    page,
    {
      userId: "user-1",
      onboardingCompletedAt: "2026-05-31T03:00:00.000Z",
    },
    spies,
  );

  await page.goto("/profile/help");
  await page.getByRole("button", { name: /inspect demo/i }).click();
  await completeHelpReplay(page);
  await page.getByRole("button", { name: /back to help/i }).click();

  await expect(page.getByRole("heading", { name: /help tutorials/i })).toBeVisible();

  const completionWrites = spies.filter(
    (spy) =>
      spy.method === "PUT" &&
      spy.url.endsWith("/api/profiles/user-1") &&
      spy.postData.includes("\"onboarding_completed_at\""),
  );

  expect(completionWrites).toHaveLength(0);
});

test("redirects admins away from /profile/help", async ({ page }) => {
  await seedSignedInSession(page, { userId: "admin-1" });
  await mockCommonApi(page, {
    userId: "admin-1",
    isAdmin: true,
  });

  await page.goto("/profile/help");
  await expect(page).toHaveURL(/\/profile$/);
});
