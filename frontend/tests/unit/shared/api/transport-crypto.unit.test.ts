import assert from "node:assert/strict";
import test from "node:test";
import {
  decryptTransportBytes,
  encryptTransportBytes,
  generateTransportRequestKey,
} from "../../../../src/shared/api/transport-crypto";

test("browser transport crypto encrypts and authenticates bytes with AES-256-GCM", async () => {
  const generated = await generateTransportRequestKey();
  const plaintext = new TextEncoder().encode("inspection payload");
  const aad = new TextEncoder().encode("POST /api/inspections");

  const encrypted = await encryptTransportBytes(plaintext, generated.aesKey, aad);
  const decrypted = await decryptTransportBytes(encrypted, generated.aesKey, aad);

  assert.equal(generated.rawKey.length, 32);
  assert.equal(encrypted.iv.length > 0, true);
  assert.notEqual(encrypted.ciphertext, new TextDecoder().decode(plaintext));
  assert.deepEqual(Array.from(decrypted), Array.from(plaintext));
});

test("browser transport crypto rejects a changed AAD", async () => {
  const generated = await generateTransportRequestKey();
  const encrypted = await encryptTransportBytes(
    new TextEncoder().encode("secret"),
    generated.aesKey,
    new TextEncoder().encode("GET /api/one"),
  );

  await assert.rejects(
    () => decryptTransportBytes(
      encrypted,
      generated.aesKey,
      new TextEncoder().encode("GET /api/two"),
    ),
    /transport decryption failed/i,
  );
});
