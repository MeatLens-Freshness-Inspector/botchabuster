import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveCenteredObjectCoverGuideBox,
  resolveSquareCropRegion,
} from "../../../../src/features/offline-analysis/lib/image-crop";

test("image crop geometry keeps a centered square inside a wide source", () => {
  const region = resolveSquareCropRegion(1600, 900);

  assert.deepEqual(region, { left: 350, top: 0, side: 900 });
});

test("object-cover guide geometry returns normalized coordinates", () => {
  const guide = resolveCenteredObjectCoverGuideBox({
    sourceWidth: 1600,
    sourceHeight: 900,
    viewportWidth: 400,
    viewportHeight: 400,
    overlayWidthRatio: 0.5,
  });

  assert.equal(guide.normalized, true);
  assert.ok(guide.size > 0 && guide.size <= 1);
  assert.ok(guide.x >= 0 && guide.y >= 0);
});
