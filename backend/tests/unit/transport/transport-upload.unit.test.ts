import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import test from "node:test";
import { materializeTransportFile } from "../../../src/middleware/upload";

test("materializes an encrypted transport file with a generated safe path", async () => {
  const file = await materializeTransportFile({
    fieldName: "image",
    fileName: "../../unsafe.jpg",
    mimeType: "image/jpeg",
    size: 3,
    bytes: Buffer.from([1, 2, 3]),
  }, {
    maxBytes: 10,
    allowedMimeTypes: ["image/jpeg"],
  });

  try {
    assert.match(file.path, /\.jpg$/);
    assert.doesNotMatch(file.path, /unsafe/);
    assert.equal(file.originalname, "../../unsafe.jpg");
    assert.deepEqual(await readFile(file.path), Buffer.from([1, 2, 3]));
  } finally {
    await rm(file.path, { force: true });
  }
});

test("rejects transport files with disallowed MIME types or sizes", async () => {
  await assert.rejects(
    () => materializeTransportFile({
      fieldName: "image",
      fileName: "sample.gif",
      mimeType: "image/gif",
      size: 1,
      bytes: Buffer.from([1]),
    }, { maxBytes: 10, allowedMimeTypes: ["image/jpeg"] }),
    /Only supported upload types are allowed/,
  );

  await assert.rejects(
    () => materializeTransportFile({
      fieldName: "image",
      fileName: "sample.jpg",
      mimeType: "image/jpeg",
      size: 11,
      bytes: Buffer.alloc(11),
    }, { maxBytes: 10, allowedMimeTypes: ["image/jpeg"] }),
    /Uploaded file exceeds the maximum allowed size/,
  );
});
