import { expect, test } from "@playwright/test";
import { mockCommonApi, seedSignedInSession } from "../../../support/fixtures/app";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("keeps the tutorial page and in-phone app content independently scrollable on mobile", async ({ page }) => {
  await seedSignedInSession(page, { userId: "tutorial-mobile" });
  await mockCommonApi(page, { userId: "tutorial-mobile", onboardingCompletedAt: null });

  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });

  const pageScroll = await page.locator("[data-tutorial-player]").evaluate((element) => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  expect(pageScroll.scrollHeight).toBeGreaterThan(pageScroll.clientHeight);
  expect(pageScroll.overflowY).toBe("auto");

  const phoneScreen = page.locator("[data-tutorial-phone-screen]");
  const appContent = page.locator("[data-tutorial-app-content]");
  await expect(page.locator("[data-tutorial-player]")).toBeVisible();
  await expect(phoneScreen).toBeVisible();
  await expect(page.locator('[data-tutorial-tab="inspect"]')).toHaveAttribute("data-active", "true");

  const regions = await appContent.evaluate((element) => ({
    overflowY: getComputedStyle(element).overflowY,
    minHeight: getComputedStyle(element).minHeight,
  }));
  expect(regions.overflowY).toBe("auto");
  expect(regions.minHeight).toBe("0px");
});
