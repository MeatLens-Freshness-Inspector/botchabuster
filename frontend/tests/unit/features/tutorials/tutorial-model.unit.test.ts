import assert from "node:assert/strict";
import test from "node:test";

import {
  firstRunOnboardingSteps,
  helpCards,
  isTutorialId,
} from "../../../../src/features/tutorials";

test("tutorial feature publishes onboarding and profile definitions", () => {
  assert.ok(firstRunOnboardingSteps.length > 0);
  assert.ok(helpCards.length > 0);
  assert.equal(isTutorialId("inspect"), true);
  assert.equal(isTutorialId("unknown"), false);
});
