import assert from "node:assert/strict";
import test from "node:test";
import { createTestApp, startTestServer } from "../../support/appFactory";
import {
  createEncryptedRequestClient,
  getTransportPublicKeyMetadata,
} from "../../support/requestFactory";

test("encrypted backend test client restores logical responses without exposing raw data", async () => {
  const app = createTestApp();
  app.get("/test-encrypted-response", (_req, res) => {
    res.setHeader("X-Logical-Header", "preserved");
    res.json({ secret: "server-side response" });
  });
  const { baseUrl, close } = await startTestServer(app);
  const originalFetch = globalThis.fetch;
  let rawApplicationBody = "";

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);
    if (String(input).endsWith("/test-encrypted-response")) {
      rawApplicationBody = await response.clone().text();
    }
    return response;
  }) as typeof globalThis.fetch;

  try {
    const metadata = await getTransportPublicKeyMetadata(baseUrl);
    const client = createEncryptedRequestClient(baseUrl, metadata);
    const response = await client.request("/test-encrypted-response");

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-logical-header"), "preserved");
    assert.deepEqual(await response.json(), { secret: "server-side response" });
    assert.doesNotMatch(rawApplicationBody, /server-side response/);
  } finally {
    globalThis.fetch = originalFetch;
    await close();
  }
});
