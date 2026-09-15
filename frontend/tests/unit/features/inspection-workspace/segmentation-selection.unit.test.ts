import assert from "node:assert/strict";
import test from "node:test";

import { resolveInspectionSegmentationDisabled } from "../../../../src/widgets/inspection-workspace/model/segmentation-selection";

test("segmentation follows the model default outside an unlocked developer session", () => {
  assert.equal(resolveInspectionSegmentationDisabled(false, true, false), false);
  assert.equal(resolveInspectionSegmentationDisabled(true, false, false), false);
  assert.equal(resolveInspectionSegmentationDisabled(true, true, true), true);
  assert.equal(resolveInspectionSegmentationDisabled(true, true, false), false);
});
