import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_DISABLE_ROI_SEGMENTATION } from "../../../../src/features/offline-analysis";

test("application preprocessing defaults enable ROI segmentation for segmented models", () => {
  assert.equal(DEFAULT_DISABLE_ROI_SEGMENTATION, false);
});
