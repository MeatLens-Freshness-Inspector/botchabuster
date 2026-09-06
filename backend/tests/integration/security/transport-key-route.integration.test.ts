import assert from "node:assert/strict";
import test from "node:test";
import "../../setup/env";
import { startTestServer } from "../../support/appFactory";

test("transport public-key route returns public metadata without private material", async () => {
  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(baseUrl + "/api/transport/public-key");
    const payload = await response.json() as Record<string, unknown>;

    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(payload).sort(), ["algorithm", "keyId", "publicKey", "version"]);
    assert.equal(payload.version, 1);
    assert.equal(payload.algorithm, "RSA-OAEP-256");
    assert.equal(payload.keyId, "test-v1");
    assert.equal(typeof payload.publicKey, "string");
    assert.doesNotMatch(String(payload.publicKey), /PRIVATE/i);
  } finally {
    await close();
  }
});
