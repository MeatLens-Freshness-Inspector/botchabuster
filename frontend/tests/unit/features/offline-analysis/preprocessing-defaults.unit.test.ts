import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_DISABLE_ROI_SEGMENTATION } from "../../../../src/features/offline-analysis";

test("application preprocessing defaults disable ROI segmentation", () => {
  assert.equal(DEFAULT_DISABLE_ROI_SEGMENTATION, true);
});
