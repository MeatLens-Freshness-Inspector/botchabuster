import assert from "node:assert/strict";
import test from "node:test";

import {
  buildImageTensorData,
  preprocessRgbPixel,
} from "../../../../src/features/offline-analysis/lib/tensor-data";
import {
  normalizeModelProbabilities,
  parsePrediction,
} from "../../../../src/features/offline-analysis/lib/classification";

test("tensor preprocessing preserves channel-first model layout", () => {
  const pixel = preprocessRgbPixel({ r: 255, g: 0, b: 127 }, "mobilenet_v3");
  const tensor = buildImageTensorData(
    { width: 1, height: 1, data: new Uint8ClampedArray([255, 0, 127, 255]) } as ImageData,
    true,
    "mobilenet_v3"
  );

  assert.equal(pixel[0], 1);
  assert.equal(pixel[1], -1);
  assert.ok(Math.abs(pixel[2] - (127 / 127.5 - 1)) < 0.000001);
  assert.deepEqual(Array.from(tensor), Array.from(new Float32Array(pixel)));
});

test("classification parsing marks an uncertain top class as warning", () => {
  const probabilities = normalizeModelProbabilities([0.45, 0.35, 0.2]);
  const result = parsePrediction(probabilities, ["fresh", "not fresh", "spoiled"]);

  assert.equal(result.predictedClass, "warning");
  assert.equal(result.confidencePercent, 80);
});
