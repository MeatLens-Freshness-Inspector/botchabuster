import assert from "node:assert/strict";
import test from "node:test";

import { resolveMobileNetGuideBox } from "../../../../src/features/offline-analysis/lib/mobilenet-input-mode";

test("disabling ROI segmentation removes the guide box for segmented models", () => {
  const guideBox = { x: 0.1, y: 0.1, size: 0.8 };

  assert.equal(resolveMobileNetGuideBox({
    preprocessContract: "segmented_center_roi",
    guideBox,
    disableRoiSegmentation: true,
  }), null);
});

test("segmented models retain the guide box when ROI segmentation is enabled", () => {
  const guideBox = { x: 0.1, y: 0.1, size: 0.8 };

  assert.deepEqual(resolveMobileNetGuideBox({
    preprocessContract: "segmented_center_roi",
    guideBox,
    disableRoiSegmentation: false,
  }), guideBox);
});

test("legacy models retain the guide box when the ROI flag is enabled", () => {
  const guideBox = { x: 0.1, y: 0.1, size: 0.8 };

  assert.deepEqual(resolveMobileNetGuideBox({
    preprocessContract: "legacy",
    guideBox,
    disableRoiSegmentation: true,
  }), guideBox);
});
