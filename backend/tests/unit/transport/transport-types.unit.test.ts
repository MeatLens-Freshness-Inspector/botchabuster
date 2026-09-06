import assert from "node:assert/strict";
import test from "node:test";
import {
  assertTransportEnvelope,
  type EncryptedTransportEnvelope,
} from "../../../src/modules/transport/domain/transport";

test("transport domain contract accepts a valid encrypted envelope", () => {
  const envelope: EncryptedTransportEnvelope = {
    version: 1,
    algorithm: "A256GCM",
    keyId: "v1",
    iv: "YWJjZGVmZ2hp",
    ciphertext: "Y2lwaGVydGV4dA",
  };

  assert.deepEqual(assertTransportEnvelope(envelope), envelope);
});

test("transport domain contract rejects missing envelope fields", () => {
  assert.throws(
    () => assertTransportEnvelope({
      version: 1,
      algorithm: "A256GCM",
      keyId: "v1",
      iv: "YWJjZGVmZ2hp",
    }),
    /invalid encrypted transport envelope/i,
  );
});
