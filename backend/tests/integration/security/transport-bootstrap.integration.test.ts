import assert from "node:assert/strict";
import test from "node:test";
import "../../setup/env";
import { startTestServer } from "../../support/appFactory";

test("transport bootstrap endpoints remain readable while normal APIs require encrypted transport", async () => {
  const { baseUrl, close } = await startTestServer();

  try {
    const healthResponse = await fetch(baseUrl + "/api/analysis/health");
    const healthBody = await healthResponse.json() as Record<string, unknown>;
    const publicKeyResponse = await fetch(baseUrl + "/api/transport/public-key");
    const publicKeyBody = await publicKeyResponse.json() as Record<string, unknown>;
    const normalResponse = await fetch(baseUrl + "/api/market-locations");
    const normalBody = await normalResponse.json() as Record<string, unknown>;

    assert.equal(healthResponse.status, 200);
    assert.equal(typeof healthBody.status, "string");
    assert.equal(publicKeyResponse.status, 200);
    assert.equal(publicKeyBody.algorithm, "RSA-OAEP-256");
    assert.equal(normalResponse.status, 400);
    assert.equal(normalBody.error, "Invalid encrypted request");
  } finally {
    await close();
  }
});
