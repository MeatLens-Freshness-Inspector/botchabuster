import { test, expect } from "@playwright/test";

test("removes Supabase auth tokens from the URL hash on public pages", async ({ page }) => {
  await page.goto("/#access_token=leaked-token&refresh_token=leaked-refresh&token_type=bearer&type=signup");

  const currentUrl = new URL(page.url());
  expect(currentUrl.hash).toBe("");
});

test("keeps reset-password recovery working while still removing hash tokens from the URL", async ({ page }) => {
  await page.goto("/reset-password#type=recovery&access_token=recovery-token");

  await expect(page.getByRole("heading", { name: "New Password" })).toBeVisible();
  const currentUrl = new URL(page.url());
  expect(currentUrl.hash).toBe("");
});
