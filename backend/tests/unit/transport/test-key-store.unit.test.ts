import assert from "node:assert/strict";
import test from "node:test";
import { createTestTransportKeyStore } from "../../../src/modules/transport/infrastructure/TransportKeyStore";

test("test transport key store creates an in-memory public key without environment configuration", () => {
  const store = createTestTransportKeyStore();
  const metadata = store.publicKeyMetadata();

  assert.equal(metadata.version, 1);
  assert.equal(metadata.algorithm, "RSA-OAEP-256");
  assert.equal(metadata.keyId, "test-v1");
  assert.match(metadata.publicKey, /^[A-Za-z0-9_-]+$/);
  assert.notEqual(store.privateKey, store.publicKey);
});
