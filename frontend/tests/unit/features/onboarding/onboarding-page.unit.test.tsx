import assert from "node:assert/strict";
import test from "node:test";

import OnboardingPage from "../../../../src/pages/inspector/onboarding-page";

test("onboarding route owns a page component", () => {
  assert.equal(typeof OnboardingPage, "function");
});
