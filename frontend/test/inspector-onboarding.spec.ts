import { expect, test } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";

test("redirects first-time inspectors to /onboarding before protected app routes", async ({ page }) => {
  test.setTimeout(900_000);

  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, {
    userId: "user-1",
    onboardingCompletedAt: null,
  });

  await page.goto("/inspect");

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: /welcome to meatlens/i })).toBeVisible();
});

test("keeps inspectors on the safety step until they acknowledge the usage notice", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, {
    userId: "user-1",
    onboardingCompletedAt: null,
  });

  await page.goto("/onboarding");
  await page.getByRole("button", { name: /begin setup/i }).click();

  await expect(page.getByRole("heading", { name: /safety and usage/i })).toBeVisible();

  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByRole("alert")).toContainText(/please acknowledge/i);

  await page.getByRole("checkbox", { name: /i understand/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  await expect(page.getByRole("heading", { name: /confirm profile/i })).toBeVisible();
});
