import assert from "node:assert/strict";
import test from "node:test";

import { resolveInspectionSegmentationDisabled } from "../../../../src/widgets/inspection-workspace/model/segmentation-selection";

test("segmentation stays disabled outside an unlocked developer session", () => {
  assert.equal(resolveInspectionSegmentationDisabled(false, true, false), true);
  assert.equal(resolveInspectionSegmentationDisabled(true, false, false), true);
  assert.equal(resolveInspectionSegmentationDisabled(true, true, true), true);
  assert.equal(resolveInspectionSegmentationDisabled(true, true, false), false);
});
