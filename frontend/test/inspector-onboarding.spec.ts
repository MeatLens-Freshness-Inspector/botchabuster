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
