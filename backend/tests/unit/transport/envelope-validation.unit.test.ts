import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import {
  createEncryptedTransportEnvelope,
  encodeBase64Url,
  getTransportAad,
  parseEncryptedTransportEnvelope,
} from "../../../src/modules/transport/infrastructure/TransportCrypto";

test("transport AAD normalizes methods and strips query strings", () => {
  assert.deepEqual(
    getTransportAad("post", "/api/inspections?scope=mine"),
    Buffer.from("POST /api/inspections"),
  );
});

test("transport envelope parser validates IV, tag, key ID, and size", () => {
  const key = randomBytes(32);
  const aad = getTransportAad("POST", "/api/inspections");
  const envelope = createEncryptedTransportEnvelope(
    "v1",
    Buffer.from('{"ok":true}'),
    key,
    aad,
  );

  const parsed = parseEncryptedTransportEnvelope(envelope, {
    expectedKeyId: "v1",
    maxCiphertextBytes: 1024,
  });
  assert.equal(parsed.iv.length, 12);
  assert.equal(parsed.tag.length, 16);

  assert.throws(
    () => parseEncryptedTransportEnvelope({ ...envelope, keyId: "old" }, {
      expectedKeyId: "v1",
      maxCiphertextBytes: 1024,
    }),
    /key id/i,
  );
  assert.throws(
    () => parseEncryptedTransportEnvelope({ ...envelope, iv: encodeBase64Url(randomBytes(11)) }, {
      expectedKeyId: "v1",
      maxCiphertextBytes: 1024,
    }),
    /iv/i,
  );
  assert.throws(
    () => parseEncryptedTransportEnvelope({ ...envelope, ciphertext: encodeBase64Url(randomBytes(1025)) }, {
      expectedKeyId: "v1",
      maxCiphertextBytes: 1024,
    }),
    /size/i,
  );
});
