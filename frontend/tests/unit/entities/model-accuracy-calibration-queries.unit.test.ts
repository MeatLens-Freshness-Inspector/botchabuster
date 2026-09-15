import assert from "node:assert/strict";
import test from "node:test";
import { modelAccuracyKeys } from "../../../src/entities/model-accuracy/model/queries";

test("calibration query keys include both dashboard filters", () => {
  assert.deepEqual(
    modelAccuracyKeys.calibration("mobilenet-primary-2026-08-13", "fresh"),
    ["model-calibration", "mobilenet-primary-2026-08-13", "fresh"],
  );
  assert.deepEqual(modelAccuracyKeys.calibration(null, null), ["model-calibration", null, null]);
});
