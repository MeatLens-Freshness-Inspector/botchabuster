import assert from "node:assert/strict";
import test from "node:test";

import {
  firstRunOnboardingSteps,
  firstRunTutorialOrder,
  helpCards,
  isTutorialId,
  tutorialDefinitions,
} from "../../../../src/features/tutorials";

test("tutorial feature publishes onboarding and profile definitions", () => {
  assert.ok(firstRunOnboardingSteps.length > 0);
  assert.ok(helpCards.length > 0);
  assert.equal(isTutorialId("inspect"), true);
  assert.equal(isTutorialId("messages"), true);
  assert.equal(isTutorialId("unknown"), false);
  assert.deepEqual(firstRunTutorialOrder, ["safety", "profile", "inspect", "history", "messages"]);
  assert.ok(firstRunOnboardingSteps.some((step) => step.tutorialId === "messages"));
  assert.deepEqual(
    tutorialDefinitions.inspect.slice(0, 3).map((step) => step.id),
    ["inspect-scope", "inspect-market", "inspect-prescan"],
  );
  assert.equal(tutorialDefinitions.inspect[0].id, "inspect-scope");
});
