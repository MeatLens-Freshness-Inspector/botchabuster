import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function readPngDimensions(relativeAssetPath: string) {
  const assetUrl = new URL(relativeAssetPath, import.meta.url);
  const buffer = await readFile(assetUrl);

  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test("gcccs rendered frame keeps the source letter aspect ratio", async () => {
  const { width, height } = await readPngDimensions(
    "../../public/letterheads/rendered/gcccs-page.png",
  );

  const actualRatio = width / height;
  const expectedLetterRatio = 612 / 792;

  assert.ok(
    Math.abs(actualRatio - expectedLetterRatio) < 0.0001,
    `expected ${width}x${height} to match letter ratio ${expectedLetterRatio}, got ${actualRatio}`,
  );
});
