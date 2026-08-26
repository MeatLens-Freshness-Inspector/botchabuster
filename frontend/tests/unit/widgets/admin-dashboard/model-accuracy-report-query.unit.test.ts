import assert from "node:assert/strict";
import test from "node:test";
import { modelAccuracyKeys } from "../../../../src/entities/model-accuracy/model/queries";

test("model accuracy history query keys include both report dates", () => {
  assert.deepEqual(
    modelAccuracyKeys.history("2026-08-01", "2026-08-31"),
    ["model-accuracy-history", "2026-08-01", "2026-08-31"],
  );
});
