import assert from "node:assert/strict";
import test from "node:test";

import { resolveModelInputPreviewOptions } from "../../../../src/features/inspection-capture/model/model-input-preview";

test("segmented preview keeps the gray ROI preprocessing by default", () => {
  const guideBox = { x: 0.1, y: 0.1, size: 0.8 };

  assert.deepEqual(resolveModelInputPreviewOptions({
    preprocessContract: "segmented_center_roi",
    guideBox,
    disableRoiSegmentation: false,
  }), {
    guideBox: null,
    forceCenterCrop: true,
    applySegmentation: true,
  });
});

test("disabled ROI segmentation uses an unmasked center crop", () => {
  const guideBox = { x: 0.1, y: 0.1, size: 0.8 };

  assert.deepEqual(resolveModelInputPreviewOptions({
    preprocessContract: "segmented_center_roi",
    guideBox,
    disableRoiSegmentation: true,
  }), {
    guideBox: null,
    forceCenterCrop: true,
    applySegmentation: false,
  });
});

test("legacy preview preprocessing remains guided even when the flag is enabled", () => {
  const guideBox = { x: 0.1, y: 0.1, size: 0.8 };

  assert.deepEqual(resolveModelInputPreviewOptions({
    preprocessContract: "legacy",
    guideBox,
    disableRoiSegmentation: true,
  }), {
    guideBox,
    forceCenterCrop: false,
    applySegmentation: false,
  });
});
