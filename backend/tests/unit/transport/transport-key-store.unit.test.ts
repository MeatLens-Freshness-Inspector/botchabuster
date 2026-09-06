import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { createTransportKeyStore } from "../../../src/modules/transport/infrastructure/TransportKeyStore";

function createPrivateKeyPem(): string {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ type: "pkcs8", format: "pem" }).toString();
}

test("transport key store normalizes escaped-newline PEM and exposes only public metadata", () => {
  const privateKey = createPrivateKeyPem();
  const store = createTransportKeyStore({
    privateKey: privateKey.replace(/\n/g, "\\n"),
    keyId: "release-1",
  });

  const metadata = store.publicKeyMetadata();
  assert.equal(metadata.keyId, "release-1");
  assert.equal(metadata.algorithm, "RSA-OAEP-256");
  assert.equal(metadata.version, 1);
  assert.match(metadata.publicKey, /^[A-Za-z0-9_-]+$/);
  assert.doesNotMatch(metadata.publicKey, /PRIVATE/i);
});

test("production transport key store rejects missing or malformed private keys", () => {
  assert.throws(
    () => createTransportKeyStore({ keyId: "release-1", nodeEnv: "production" }),
    /transport private key is required/i,
  );
  assert.throws(
    () => createTransportKeyStore({
      privateKey: "not-a-private-key",
      keyId: "release-1",
      nodeEnv: "production",
    }),
    /transport private key is invalid/i,
  );
});
