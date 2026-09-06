import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import test from "node:test";
import {
  unwrapAesKey,
  wrapAesKey,
} from "../../../src/modules/transport/infrastructure/TransportCrypto";

test("RSA-OAEP wraps and unwraps a 256-bit AES key", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const aesKey = randomBytes(32);

  const wrapped = wrapAesKey(aesKey, publicKey);

  assert.match(wrapped, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(unwrapAesKey(wrapped, privateKey), aesKey);
});

test("RSA-OAEP rejects the wrong private key and malformed ciphertext", () => {
  const firstPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const secondPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const wrapped = wrapAesKey(randomBytes(32), firstPair.publicKey);

  assert.throws(
    () => unwrapAesKey(wrapped, secondPair.privateKey),
    /transport key unwrap failed/i,
  );
  assert.throws(
    () => unwrapAesKey("not-valid", firstPair.privateKey),
    /transport key unwrap failed/i,
  );
});
