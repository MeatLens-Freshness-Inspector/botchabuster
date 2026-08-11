import assert from "node:assert/strict";
import test from "node:test";

import { resolveThemePreference } from "../../../src/app/providers/theme-controller";

test("theme controller forces light mode on public and onboarding routes", () => {
  for (const pathname of ["/", "/signup", "/login", "/forgot-password", "/reset-password", "/onboarding"]) {
    assert.equal(resolveThemePreference(pathname, true, true), false);
  }
});

test("theme controller follows the signed-in profile outside forced-light routes", () => {
  assert.equal(resolveThemePreference("/inspect", true, true), true);
  assert.equal(resolveThemePreference("/inspect", true, false), false);
  assert.equal(resolveThemePreference("/inspect", false, true), false);
});
