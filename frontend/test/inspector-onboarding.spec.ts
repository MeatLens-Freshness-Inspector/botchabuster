import { expect, test, type Page } from "@playwright/test";
import type { ApiSpy } from "./helpers/app";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";

async function completeRequiredTutorial(page: Page): Promise<void> {
  await page.getByRole("button", { name: /i understand the reminder/i }).click();
  await page.getByRole("button", { name: /show my account details/i }).click();
  await page.getByRole("button", { name: /show my access code/i }).click();
  await page.getByRole("button", { name: /open help from profile/i }).click();
  await page.getByRole("button", { name: /choose market/i }).click();
  await page.getByRole("button", { name: /open capture/i }).click();
  await page.getByRole("button", { name: /run analysis/i }).click();
  await page.getByRole("button", { name: /save result/i }).click();
  await page.getByRole("button", { name: /open a saved inspection/i }).click();
  await page.getByRole("button", { name: /review the freshness details/i }).click();
  await page.getByRole("button", { name: /return to the history list/i }).click();
}

test("lets inspectors skip onboarding for the current session", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, {
    userId: "user-1",
    onboardingCompletedAt: null,
  });

  await page.goto("/inspect");
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByRole("button", { name: /skip for now/i }).click();

  await expect(page).toHaveURL(/\/inspect$/);

  await page.goto("/history");
  await expect(page).toHaveURL(/\/history$/);
});

test("shows onboarding again on a later sign-in after a skip", async ({ browser }) => {
  const firstContext = await browser.newContext();
  const firstPage = await firstContext.newPage();

  await seedSignedInSession(firstPage, { userId: "user-1" });
  await mockCommonApi(firstPage, {
    userId: "user-1",
    onboardingCompletedAt: null,
  });

  await firstPage.goto("/inspect");
  await firstPage.getByRole("button", { name: /skip for now/i }).click();
  await expect(firstPage).toHaveURL(/\/inspect$/);
  await firstContext.close();

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();

  await seedSignedInSession(secondPage, { userId: "user-1" });
  await mockCommonApi(secondPage, {
    userId: "user-1",
    onboardingCompletedAt: null,
  });

  await secondPage.goto("/inspect");
  await expect(secondPage).toHaveURL(/\/onboarding$/);

  await secondContext.close();
});

test("redirects first-time inspectors to /onboarding before protected app routes", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, {
    userId: "user-1",
    onboardingCompletedAt: null,
  });

  await page.goto("/inspect");

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("button", { name: /i understand the reminder/i })).toBeVisible();
});

test("renders a simulated profile walkthrough instead of editable account inputs", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, {
    userId: "user-1",
    onboardingCompletedAt: null,
  });

  await page.goto("/onboarding");
  await page.getByRole("button", { name: /i understand the reminder/i }).click();

  await expect(page.getByLabel("Full Name")).toHaveCount(0);
  await expect(page.getByLabel("Email")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /show my account details/i })).toBeVisible();
});

test("advances through the strict guided tutorial in order", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, {
    userId: "user-1",
    onboardingCompletedAt: null,
  });

  await page.goto("/onboarding");

  await expect(page.getByRole("button", { name: /show my account details/i })).toHaveCount(0);
  await page.getByRole("button", { name: /i understand the reminder/i }).click();

  await expect(page.getByRole("button", { name: /show my account details/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /choose market/i })).toHaveCount(0);
  await page.getByRole("button", { name: /show my account details/i }).click();

  await expect(page.getByRole("button", { name: /show my access code/i })).toBeVisible();
});

test("marks onboarding complete and opens Inspect after the required demos", async ({ page }) => {
  const spies: ApiSpy[] = [];

  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(
    page,
    {
      userId: "user-1",
      onboardingCompletedAt: null,
    },
    spies,
  );

  await page.goto("/onboarding");
  await completeRequiredTutorial(page);
  await page.getByRole("button", { name: /start inspecting/i }).click();

  await expect(page).toHaveURL(/\/inspect$/);
  await expect(page.getByRole("heading", { name: "Inspect" })).toBeVisible();

  const completionWrite = spies
    .filter((spy) => spy.method === "PUT" && spy.url.endsWith("/api/profiles/user-1"))
    .at(-1);

  expect(completionWrite?.postData ?? "").toContain("\"onboarding_completed_at\"");
});

test("lets completed inspectors bypass onboarding", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, {
    userId: "user-1",
    onboardingCompletedAt: "2026-05-31T03:00:00.000Z",
  });

  await page.goto("/inspect");

  await expect(page).toHaveURL(/\/inspect$/);
  await expect(page.getByRole("heading", { name: "Inspect" })).toBeVisible();
});

test("lets admins bypass inspector onboarding", async ({ page }) => {
  await seedSignedInSession(page, { userId: "admin-1" });
  await mockCommonApi(page, {
    userId: "admin-1",
    isAdmin: true,
    onboardingCompletedAt: null,
  });

  await page.goto("/inspect");

  await expect(page).toHaveURL(/\/inspect$/);
  await expect(page.getByRole("heading", { name: "Inspect" })).toBeVisible();
});

test("shows a blocking retry screen when onboarding status cannot be loaded", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, {
    userId: "user-1",
    onboardingCompletedAt: null,
    failProfileLoad: true,
  });

  await page.goto("/inspect");

  await expect(
    page.getByRole("heading", { name: /couldn't load your onboarding status/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
});

test("shows an Open Help action on the onboarding completion screen", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, {
    userId: "user-1",
    onboardingCompletedAt: null,
  });

  await page.goto("/onboarding");
  await completeRequiredTutorial(page);

  await expect(page.getByRole("button", { name: /start inspecting/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /open help/i })).toBeVisible();
});

test("keeps inspectors on the completion screen when the completion write fails", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, {
    userId: "user-1",
    onboardingCompletedAt: null,
    failOnboardingCompletion: true,
  });

  await page.goto("/onboarding");
  await completeRequiredTutorial(page);
  await page.getByRole("button", { name: /start inspecting/i }).click();

  await expect(page.getByRole("button", { name: /start inspecting/i })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(/failed to finish onboarding/i);
});
