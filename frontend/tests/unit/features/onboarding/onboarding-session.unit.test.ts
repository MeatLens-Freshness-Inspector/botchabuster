import assert from "node:assert/strict";
import test from "node:test";

import {
  clearOnboardingSkippedForSession,
  hasSkippedOnboardingForSession,
  markOnboardingSkippedForSession,
} from "../../../../src/features/onboarding";

test("onboarding session exposes skip lifecycle operations", () => {
  assert.equal(typeof hasSkippedOnboardingForSession, "function");
  assert.equal(typeof markOnboardingSkippedForSession, "function");
  assert.equal(typeof clearOnboardingSkippedForSession, "function");
});
