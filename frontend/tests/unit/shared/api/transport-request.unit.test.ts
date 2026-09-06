import assert from "node:assert/strict";
import test from "node:test";
import {
  createEncryptedRequest,
  serializeTransportRequestBody,
} from "../../../../src/shared/api/transport-crypto";

test("serializes JSON and binary request bodies into logical transport payloads", async () => {
  const json = await serializeTransportRequestBody('{"message":"hello"}', "application/json");
  assert.deepEqual(json, {
    kind: "json",
    contentType: "application/json",
    value: '{"message":"hello"}',
  });

  const bytes = await serializeTransportRequestBody(new Uint8Array([0, 1, 255]), "application/octet-stream");
  assert.equal(bytes?.kind, "bytes");
  assert.equal(bytes?.contentType, "application/octet-stream");
  assert.equal(bytes?.value, "AAH_");

  const params = await serializeTransportRequestBody(new URLSearchParams({ query: "fresh meat" }));
  assert.equal(params?.kind, "bytes");
  assert.equal(params?.contentType, "application/x-www-form-urlencoded;charset=UTF-8");

  const blob = await serializeTransportRequestBody(new Blob(["zip"], { type: "application/zip" }));
  assert.equal(blob?.contentType, "application/zip");

  assert.equal(await serializeTransportRequestBody(undefined), null);
  await assert.rejects(
    () => serializeTransportRequestBody(new FormData()),
    /Unsupported transport request body/,
  );
});

test("prepares a request with an ephemeral AES key and wrapped transport header", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    version: 1,
    algorithm: "RSA-OAEP-256",
    keyId: "test-v1",
    publicKey: "AQIDBA",
  }), { status: 200 })) as typeof globalThis.fetch;

  try {
    await assert.rejects(
      () => createEncryptedRequest("https://example.test/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "value" }),
      }),
      /Invalid|Operation|key/i,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
