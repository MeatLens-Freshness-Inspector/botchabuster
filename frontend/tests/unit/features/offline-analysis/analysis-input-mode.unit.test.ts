import assert from "node:assert/strict";
import test from "node:test";

import {
  prepareMobileNetInputImageData,
  resolveMobileNetGuideBox,
} from "../../../../src/features/offline-analysis/lib/mobilenet-input-mode";

test("the MobileNet default uses the training center crop when segmentation is enabled", () => {
  const guideBox = { x: 0.1, y: 0.1, size: 0.8 };

  assert.equal(resolveMobileNetGuideBox({
    preprocessContract: "segmented_center_roi",
    guideBox,
  }), null);
});

test("disabling ROI segmentation removes the guide box for segmented models", () => {
  const guideBox = { x: 0.1, y: 0.1, size: 0.8 };

  assert.equal(resolveMobileNetGuideBox({
    preprocessContract: "segmented_center_roi",
    guideBox,
    disableRoiSegmentation: true,
  }), null);
});

test("segmented models keep the training center crop when ROI segmentation is enabled", () => {
  const guideBox = { x: 0.1, y: 0.1, size: 0.8 };

  assert.equal(resolveMobileNetGuideBox({
    preprocessContract: "segmented_center_roi",
    guideBox,
    disableRoiSegmentation: false,
  }), null);
});

test("legacy models retain the guide box when the ROI flag is enabled", () => {
  const guideBox = { x: 0.1, y: 0.1, size: 0.8 };

  assert.deepEqual(resolveMobileNetGuideBox({
    preprocessContract: "legacy",
    guideBox,
    disableRoiSegmentation: true,
  }), guideBox);
});

class TestImageData {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

function makeImageData(): ImageData {
  const width = 32;
  const height = 32;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const [red, green, blue] = x >= 6 && x < 26 && y >= 6 && y < 26
        ? [170, 70, 65]
        : [255, 255, 255];
      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = 255;
    }
  }
  return new TestImageData(data, width, height) as unknown as ImageData;
}

function withImageData<T>(callback: () => T): T {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "ImageData");
  Object.defineProperty(globalThis, "ImageData", {
    configurable: true,
    value: TestImageData,
    writable: true,
  });
  try {
    return callback();
  } finally {
    if (previous) Object.defineProperty(globalThis, "ImageData", previous);
    else Reflect.deleteProperty(globalThis, "ImageData");
  }
}

test("segmented MobileNet input is prepared with ROI preprocessing by default", () => {
  const result = withImageData(() => prepareMobileNetInputImageData(makeImageData(), {
    preprocessContract: "segmented_center_roi",
  }));

  assert.equal(result.segmentationApplied, true);
  assert.deepEqual(Array.from(result.imageData.data.slice(0, 3)), [127, 127, 127]);
});

test("explicitly disabled ROI preprocessing keeps the original crop", () => {
  const input = makeImageData();
  const result = withImageData(() => prepareMobileNetInputImageData(input, {
    preprocessContract: "segmented_center_roi",
    disableRoiSegmentation: true,
  }));

  assert.equal(result.segmentationApplied, false);
  assert.deepEqual(Array.from(result.imageData.data), Array.from(input.data));
});
