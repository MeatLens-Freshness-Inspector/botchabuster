import { expect, test } from "@playwright/test";

test("renders a proper 404 page with recovery actions", async ({ page }) => {
  await page.goto("/missing-route");

  await expect(page.getByText("404", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /the page you requested does not exist/i }),
  ).toBeVisible();
  await expect(page.getByText("/missing-route")).toBeVisible();
  await expect(page.getByRole("link", { name: /go to home/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /go back/i })).toBeVisible();
});
