import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_TRANSPORT_REQUEST_BYTES,
  serializeTransportFormData,
} from "../../../../src/shared/api/transport-crypto";

test("serializes form fields and file bytes without multipart boundaries", async () => {
  const formData = new FormData();
  formData.append("description", "inspection image");
  formData.append("image", new File([new Uint8Array([1, 2, 3])], "sample.jpg", { type: "image/jpeg" }));

  const payload = await serializeTransportFormData(formData);
  assert.equal(payload.kind, "form-data");
  assert.deepEqual(JSON.parse(payload.value ?? "{}"), { description: "inspection image" });
  assert.equal(payload.files?.[0].fieldName, "image");
  assert.equal(payload.files?.[0].fileName, "sample.jpg");
  assert.equal(payload.files?.[0].mimeType, "image/jpeg");
  assert.equal(payload.files?.[0].size, 3);
  assert.equal(payload.files?.[0].bytes, "AQID");
  assert.doesNotMatch(JSON.stringify(payload), /multipart boundary/i);
});

test("rejects form files over the transport limit", async () => {
  const formData = new FormData();
  formData.append("package", new Blob([new Uint8Array(MAX_TRANSPORT_REQUEST_BYTES + 1)], { type: "application/zip" }), "run.zip");

  await assert.rejects(
    () => serializeTransportFormData(formData),
    /Transport request body is too large/,
  );
});
