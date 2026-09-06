import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import {
  decryptAesGcm,
  encryptAesGcm,
} from "../../../src/modules/transport/infrastructure/TransportCrypto";

test("backend AES-256-GCM encrypts and authenticates a payload", () => {
  const key = randomBytes(32);
  const plaintext = Buffer.from("meat inspection payload");
  const aad = Buffer.from("POST /api/inspections");
  const encrypted = encryptAesGcm(plaintext, key, aad);

  assert.equal(encrypted.iv.length, 12);
  assert.notDeepEqual(encrypted.ciphertext, plaintext);
  assert.deepEqual(decryptAesGcm(encrypted, key, aad), plaintext);
});

test("backend AES-256-GCM rejects a changed AAD or authenticated bytes", () => {
  const key = randomBytes(32);
  const encrypted = encryptAesGcm(
    Buffer.from("secret"),
    key,
    Buffer.from("GET /api/health"),
  );
  const tamperedCiphertext = Buffer.from(encrypted.ciphertext);
  tamperedCiphertext[0] ^= 1;

  assert.throws(
    () => decryptAesGcm(encrypted, key, Buffer.from("GET /api/other")),
    /transport decryption failed/i,
  );
  assert.throws(
    () => decryptAesGcm(
      { ...encrypted, ciphertext: tamperedCiphertext },
      key,
      Buffer.from("GET /api/health"),
    ),
    /transport decryption failed/i,
  );
});
