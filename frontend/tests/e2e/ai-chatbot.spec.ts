import { test, expect } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "./support/app";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/analysis/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok" }),
    });
  });
});

test("uses a viewport-clamped mobile window when opened", async ({ page }) => {
  await seedSignedInSession(page, { userId: "user-1" });
  await mockCommonApi(page, { userId: "user-1" });

  await page.goto("/inspect");
  await expect(page.getByRole("heading", { name: "Inspect" })).toBeVisible();

  await page.getByLabel("Open AI chat").click();
  const chatWindow = page.getByTestId("ai-chat-window");

  await expect(chatWindow).toBeVisible();

  const className = await chatWindow.getAttribute("class");
  expect(className).toContain("left-3");
  expect(className).toContain("right-3");
  expect(className).toContain("w-[calc(100vw-1.5rem)]");
  expect(className).toContain("max-w-[380px]");
});
