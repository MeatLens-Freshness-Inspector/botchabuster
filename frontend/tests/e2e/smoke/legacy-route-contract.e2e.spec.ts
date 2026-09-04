import { expect, test } from "@playwright/test";
import { ROUTE_CONTRACT_PATHS } from "../../../src/app/router/paths";

const publicRoutePaths = new Set(["/", "/login", "/signup", "/forgot-password", "/reset-password"]);

for (const routePath of ROUTE_CONTRACT_PATHS) {
  test("route contract resolves " + routePath, async ({ page }) => {
    await page.goto(routePath);
    await expect(page.locator("#root")).not.toBeEmpty();
    await expect(page.getByText("The page you requested does not exist", { exact: false })).toHaveCount(0);

    if (publicRoutePaths.has(routePath)) {
      const expectedPath = routePath === "/" ? "\\/" : routePath.replaceAll("/", "\\/");
      await expect(page).toHaveURL(new RegExp(expectedPath + "(?:$|\\?)"));
      return;
    }

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  });
}
