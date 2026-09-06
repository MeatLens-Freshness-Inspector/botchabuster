import assert from "node:assert/strict";
import test from "node:test";
import {
  decryptTransportResponse,
  encryptTransportBytes,
  generateTransportRequestKey,
} from "../../../../src/shared/api/transport-crypto";

const AAD = new TextEncoder().encode("GET /api/profile");

async function encryptedResponse(
  body: string | Uint8Array,
  bodyEncoding: "utf8" | "base64",
  status = 200,
): Promise<{ response: Response; key: CryptoKey }> {
  const generated = await generateTransportRequestKey();
  const plaintext = JSON.stringify({
    contentType: bodyEncoding === "base64" ? "application/zip" : "application/json; charset=utf-8",
    headers: { "x-logical-header": "restored" },
    body: bodyEncoding === "base64" ? Buffer.from(body).toString("base64url") : body,
    bodyEncoding,
  });
  const encrypted = await encryptTransportBytes(new TextEncoder().encode(plaintext), generated.aesKey, AAD);
  return {
    response: new Response(JSON.stringify({
      version: 1,
      algorithm: "A256GCM",
      keyId: "test-v1",
      ...encrypted,
    }), { status }),
    key: generated.aesKey,
  };
}

test("decrypts logical JSON responses and keeps HTTP status and headers", async () => {
  const { response, key } = await encryptedResponse('{"secret":"restored"}', "utf8", 403);
  const restored = await decryptTransportResponse(response, {
    key,
    aad: AAD,
    keyId: "test-v1",
  });

  assert.equal(restored.status, 403);
  assert.equal(restored.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(restored.headers.get("x-logical-header"), "restored");
  assert.deepEqual(await restored.json(), { secret: "restored" });
});

test("decrypts binary responses as the original bytes", async () => {
  const { response, key } = await encryptedResponse(new Uint8Array([80, 75, 3, 4]), "base64");
  const restored = await decryptTransportResponse(response, {
    key,
    aad: AAD,
    keyId: "test-v1",
  });

  assert.deepEqual(new Uint8Array(await restored.arrayBuffer()), new Uint8Array([80, 75, 3, 4]));
});
