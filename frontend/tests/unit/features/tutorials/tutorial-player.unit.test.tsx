import assert from "node:assert/strict";
import test from "node:test";

import { TutorialPlayer, TutorialScene } from "../../../../src/features/tutorials";

test("tutorial feature publishes player and scene components", () => {
  assert.equal(typeof TutorialPlayer, "function");
  assert.equal(typeof TutorialScene, "function");
});
