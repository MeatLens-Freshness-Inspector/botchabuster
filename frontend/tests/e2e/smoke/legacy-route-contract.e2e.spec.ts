import { expect, test } from "@playwright/test";
import { ROUTE_CONTRACT_PATHS } from "../../../src/app/router/paths";

test("all established route URLs resolve through the SPA contract", async ({ page }) => {
  for (const routePath of ROUTE_CONTRACT_PATHS) {
    await page.goto(routePath);
    await expect(page.locator("#root")).not.toBeEmpty();
    await expect(page.getByText("The page you requested does not exist", { exact: false })).toHaveCount(0);

    if (routePath === "/" || routePath === "/login" || routePath === "/signup" || routePath === "/forgot-password" || routePath === "/reset-password") {
      await expect(page).toHaveURL(new RegExp(`${routePath === "/" ? "\\/" : routePath.replaceAll("/", "\\/")}(?:$|\\?)`));
    } else {
      await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    }
  }
});
