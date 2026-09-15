import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanMaskWithMorphology,
  selectBestCentralComponent,
} from "../../../../src/features/offline-analysis/lib/mask-morphology";

test("uses training-sized morphology to remove small noise while retaining a central region", () => {
  const source = new Uint8Array(31 * 31);
  for (let y = 5; y <= 25; y += 1) {
    for (let x = 5; x <= 25; x += 1) source[y * 31 + x] = 1;
  }
  source[2 * 31 + 2] = 1;

  const cleaned = cleanMaskWithMorphology(source, 31, 31);

  assert.equal(cleaned[15 * 31 + 15], 1);
  assert.equal(cleaned[2 * 31 + 2], 0);
});

test("selects the largest central component using training quality metrics", () => {
  const source = new Uint8Array(64 * 64);
  for (let y = 22; y <= 41; y += 1) {
    for (let x = 22; x <= 41; x += 1) source[y * 64 + x] = 1;
  }
  for (let y = 1; y <= 15; y += 1) {
    for (let x = 1; x <= 15; x += 1) source[y * 64 + x] = 1;
  }

  const result = selectBestCentralComponent(source, 64, 64);

  assert.ok(result);
  assert.equal(result.mask[31 * 64 + 31], 1);
  assert.equal(result.mask[1 * 64 + 1], 0);
  assert.equal(result.numberOfComponents, 2);
  assert.ok(result.centerOverlapRatio >= 0.08);
});
