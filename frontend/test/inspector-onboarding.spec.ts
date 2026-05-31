import { expect, test } from "@playwright/test";
import type { ApiSpy } from "./helpers/app";
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

test("saves confirmed profile details before moving past confirm profile", async ({ page }) => {
  const spies: ApiSpy[] = [];

  await seedSignedInSession(page, {
    userId: "user-1",
    email: "old@example.com",
  });
  await mockCommonApi(
    page,
    {
      userId: "user-1",
      email: "old@example.com",
      onboardingCompletedAt: null,
    },
    spies,
  );

  await page.goto("/onboarding");
  await page.getByRole("button", { name: /begin setup/i }).click();
  await page.getByRole("checkbox", { name: /i understand/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  await page.getByLabel("Full Name").fill("Inspector Rivera");
  await page.getByLabel("Email").fill("rivera@example.com");
  await page.getByRole("button", { name: /save and continue/i }).click();

  await expect(page.getByRole("heading", { name: /how inspect works/i })).toBeVisible();

  const profilePut = spies.find((spy) => spy.method === "PUT" && spy.url.endsWith("/api/profiles/user-1"));
  const emailPatch = spies.find((spy) => spy.method === "PATCH" && spy.url.endsWith("/api/auth/users/user-1/email"));

  expect(profilePut?.postData ?? "").toContain("\"full_name\":\"Inspector Rivera\"");
  expect(emailPatch?.postData ?? "").toContain("\"email\":\"rivera@example.com\"");
});

test("keeps inspectors on confirm profile when saving fails", async ({ page }) => {
  await seedSignedInSession(page, {
    userId: "user-1",
    email: "old@example.com",
  });
  await mockCommonApi(page, {
    userId: "user-1",
    email: "old@example.com",
    onboardingCompletedAt: null,
    failProfileUpdate: true,
  });

  await page.goto("/onboarding");
  await page.getByRole("button", { name: /begin setup/i }).click();
  await page.getByRole("checkbox", { name: /i understand/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  await page.getByLabel("Full Name").fill("Inspector Rivera");
  await page.getByRole("button", { name: /save and continue/i }).click();

  await expect(page.getByRole("heading", { name: /confirm profile/i })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(/failed to save profile/i);
});

test("marks onboarding complete and opens Inspect after the required steps", async ({ page }) => {
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
  await page.getByRole("button", { name: /begin setup/i }).click();
  await page.getByRole("checkbox", { name: /i understand/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /save and continue/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
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

test("redirects completed inspectors away from /onboarding", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, {
    userId: "user-1",
    onboardingCompletedAt: "2026-05-31T03:00:00.000Z",
  });

  await page.goto("/onboarding");

  await expect(page).toHaveURL(/\/inspect$/);
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

  await expect(page.getByRole("heading", { name: /couldn't load your onboarding status/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
});

test("keeps inspectors on the completion screen when the completion write fails", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, {
    userId: "user-1",
    onboardingCompletedAt: null,
    failOnboardingCompletion: true,
  });

  await page.goto("/onboarding");
  await page.getByRole("button", { name: /begin setup/i }).click();
  await page.getByRole("checkbox", { name: /i understand/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /save and continue/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /start inspecting/i }).click();

  await expect(page.getByRole("heading", { name: /setup complete/i })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(/failed to finish onboarding/i);
});
