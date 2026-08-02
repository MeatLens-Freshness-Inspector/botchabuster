import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

async function readFileSha256(relativeAssetPath: string) {
  const assetUrl = new URL(relativeAssetPath, import.meta.url);
  const buffer = await readFile(assetUrl);

  return createHash("sha256").update(buffer).digest("hex");
}

test("gcccs rendered frame keeps the source letter aspect ratio", async () => {
  const { width, height } = await readPngDimensions(
    "../../../../public/letterheads/rendered/gcccs-page.png",
  );

  const actualRatio = width / height;
  const expectedLetterRatio = 612 / 792;

  assert.ok(
    Math.abs(actualRatio - expectedLetterRatio) < 0.0001,
    `expected ${width}x${height} to match letter ratio ${expectedLetterRatio}, got ${actualRatio}`,
  );
});

test("dti rendered frame keeps the source letter aspect ratio", async () => {
  const { width, height } = await readPngDimensions(
    "../../../../public/letterheads/rendered/dti-page.png",
  );
  const sourceHash = await readFileSha256(
    "../../../../public/letterheads/DTI zambales letterhead.pdf",
  );
  const renderedHash = await readFileSha256(
    "../../../../public/letterheads/rendered/dti-page.png",
  );

  const actualRatio = width / height;
  const expectedLetterRatio = 612 / 792;

  assert.equal(
    sourceHash,
    "9a447993ee5a558c3343d483d7aa0456e316f859b37c8219c77df0b20cedceea",
  );
  assert.equal(
    renderedHash,
    "5e0f00f995ebe8e4f7f99dfed60ae7f346dee287c8252699c2c0dc8cb4f0939a",
  );
  assert.ok(
    Math.abs(actualRatio - expectedLetterRatio) < 0.0001,
    `expected ${width}x${height} to match letter ratio ${expectedLetterRatio}, got ${actualRatio}`,
  );
});

test("city vet rendered frame keeps the source letter aspect ratio", async () => {
  const { width, height } = await readPngDimensions(
    "../../../../public/letterheads/rendered/city-vet-page.png",
  );
  const sourceHash = await readFileSha256(
    "../../../../public/letterheads/City Vet letterhead.pdf",
  );
  const renderedHash = await readFileSha256(
    "../../../../public/letterheads/rendered/city-vet-page.png",
  );

  const actualRatio = width / height;
  const expectedLetterRatio = 612 / 792;

  assert.equal(
    sourceHash,
    "0c944a91489c672cd2369ab2a05ed6afc4d56bf695aa68c0e88de2ae040e93b9",
  );
  assert.equal(
    renderedHash,
    "552eeb901a20fa07afce6e17b1d01753aef744c932a2117f5f62b146f339f6da",
  );
  assert.ok(
    Math.abs(actualRatio - expectedLetterRatio) < 0.0001,
    `expected ${width}x${height} to match letter ratio ${expectedLetterRatio}, got ${actualRatio}`,
  );
});
