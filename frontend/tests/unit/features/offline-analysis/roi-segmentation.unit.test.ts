import assert from "node:assert/strict";
import test from "node:test";

import { applyRoiSegmentationWithFallback } from "../../../../src/features/offline-analysis/lib/roi-segmentation";

type Rgb = [number, number, number];

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

function makeImageData(width: number, height: number, pixelAt: (x: number, y: number) => Rgb): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const [red, green, blue] = pixelAt(x, y);
      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = 255;
    }
  }
  return new TestImageData(data, width, height) as unknown as ImageData;
}

function rgbAt(imageData: ImageData, x: number, y: number): Rgb {
  const offset = (y * imageData.width + x) * 4;
  return [imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2]];
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

test("segments the training-compatible foreground and fills background gray", () => {
  const input = makeImageData(32, 32, (x, y) =>
    x >= 6 && x < 26 && y >= 6 && y < 26 ? [170, 70, 65] : [255, 255, 255],
  );

  const result = withImageData(() => applyRoiSegmentationWithFallback(input));

  assert.equal(result.segmented, true);
  assert.deepEqual(rgbAt(result.imageData, 0, 0), [127, 127, 127]);
  assert.deepEqual(rgbAt(result.imageData, 16, 16), [170, 70, 65]);
});

test("falls back to the original crop when no valid ROI is found", () => {
  const input = makeImageData(32, 32, () => [255, 255, 255]);

  const result = withImageData(() => applyRoiSegmentationWithFallback(input));

  assert.equal(result.segmented, false);
  assert.deepEqual(Array.from(result.imageData.data), Array.from(input.data));
});

test("rejects high-value low-saturation white pixels as foreground", () => {
  const input = makeImageData(32, 32, () => [248, 248, 248]);

  const result = withImageData(() => applyRoiSegmentationWithFallback(input));

  assert.equal(result.segmented, false);
});
