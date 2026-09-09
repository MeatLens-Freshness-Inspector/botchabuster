import assert from "node:assert/strict";
import test from "node:test";

import {
  tutorialFixtures,
  type TutorialFixtureKey,
} from "../../../../src/features/tutorials";

test("tutorial fixtures identify simulated inspector values without using account data", () => {
  const expectedKeys: TutorialFixtureKey[] = [
    "profile",
    "inspect",
    "history",
    "messages",
  ];

  assert.deepEqual(Object.keys(tutorialFixtures), expectedKeys);
  assert.equal(tutorialFixtures.profile.isSimulated, true);
  assert.equal(tutorialFixtures.inspect.locationLabel, "Dagupan City Slaughterhouse");
  assert.equal(tutorialFixtures.history.classification, "Fresh");
  assert.equal(tutorialFixtures.messages.connectionStatus, "connected");
});
