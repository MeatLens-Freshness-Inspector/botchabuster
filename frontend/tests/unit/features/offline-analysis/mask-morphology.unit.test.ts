import assert from "node:assert/strict";
import test from "node:test";

import { cleanMaskWithMorphology } from "../../../../src/features/offline-analysis/lib/mask-morphology";

test("mask morphology preserves a stable central foreground region", () => {
  const source = new Uint8Array([
    0, 0, 0, 0, 0,
    0, 1, 1, 1, 0,
    0, 1, 1, 1, 0,
    0, 1, 1, 1, 0,
    0, 0, 0, 0, 0,
  ]);

  const cleaned = cleanMaskWithMorphology(source, 5, 5);

  assert.equal(cleaned[12], 1);
  assert.equal(cleaned.reduce((sum, value) => sum + value, 0), 9);
});
