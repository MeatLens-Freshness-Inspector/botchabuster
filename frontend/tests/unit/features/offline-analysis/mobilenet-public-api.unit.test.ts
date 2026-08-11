import assert from "node:assert/strict";
import test from "node:test";

import {
  getActiveModelPreprocessContract,
  getActiveMobileNetModelVariant,
  getLoadedModelPath,
  isModelReady,
  loadMobileNetV3,
  prewarmModel,
} from "../../../../src/features/offline-analysis";

test("offline analysis exposes the MobileNet facade through its feature API", () => {
  assert.equal(typeof getActiveModelPreprocessContract, "function");
  assert.equal(typeof getActiveMobileNetModelVariant, "function");
  assert.equal(typeof getLoadedModelPath, "function");
  assert.equal(typeof isModelReady, "function");
  assert.equal(typeof loadMobileNetV3, "function");
  assert.equal(typeof prewarmModel, "function");
});
