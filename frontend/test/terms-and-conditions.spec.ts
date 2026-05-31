import { test, expect } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "./helpers/app";

test("signup requires accepting terms and conditions before account creation", async ({ page }) => {
  let signUpCalls = 0;
  let signUpPayload = "";

  await page.route("**/api/analysis/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok" }),
    });
  });

  await page.route("**/api/auth/sign-up", async (route) => {
    signUpCalls += 1;
    signUpPayload = route.request().postData() ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: null, session: null }),
    });
  });

  await page.goto("/signup");
  await page.getByLabel("Full Name").fill("Inspector One");
  await page.getByLabel("Email").fill("inspector.one@example.com");
  await page.getByLabel("Password").fill("hunter22");
  await page.getByLabel("Access Code").fill("INSP-001");

  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(page.getByRole("alert")).toContainText(/accept the terms and conditions/i);
  expect(signUpCalls).toBe(0);

  await page.getByRole("checkbox", { name: /i agree to the meatlens terms and conditions/i }).click();
  await page.getByRole("checkbox", { name: /i have read the meatlens privacy policy/i }).click();
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect.poll(() => signUpCalls).toBe(1);
  expect(signUpPayload).toContain("\"email\":\"inspector.one@example.com\"");
  expect(signUpPayload).toContain("\"password\":\"hunter22\"");
  expect(signUpPayload).toContain("\"fullName\":\"Inspector One\"");
});

test("profile includes a terms and conditions reminder section", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });

  await page.goto("/profile");

  await expect(page.getByText(/terms and conditions reminder/i)).toBeVisible();
  const viewTermsButton = page.getByRole("button", { name: /view terms and conditions/i }).first();
  await expect(viewTermsButton).toBeVisible();

  await viewTermsButton.click();
  const termsDialog = page.getByRole("dialog");
  await expect(termsDialog).toBeVisible();
  await expect(termsDialog.getByRole("heading", { name: "MeatLens Terms and Conditions" })).toBeVisible();
  await expect(termsDialog.getByText(/supporting inspectors, not replacing them/i)).toBeVisible();
});
