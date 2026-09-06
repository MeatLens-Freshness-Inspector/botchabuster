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
  app.post("/test-encrypted-echo", (req, res) => {
    res.json({ received: req.body });
  });
  app.get("/test-encrypted-binary", (_req, res) => {
    res.type("application/octet-stream").send(Buffer.from("raw-binary-secret"));
  });
  const { baseUrl, close } = await startTestServer(app);
  const originalFetch = globalThis.fetch;
  let rawApplicationBody = "";
  let rawRequestBody = "";

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith("/test-encrypted-echo")) {
      rawRequestBody = String(init?.body ?? "");
    }
    const response = await originalFetch(input, init);
    if (
      String(input).endsWith("/test-encrypted-response")
      || String(input).endsWith("/test-encrypted-binary")
    ) {
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

    const echo = await client.json("/test-encrypted-echo", {
      secret: "client-side request",
      count: 7,
    }, { method: "POST" });
    assert.deepEqual(await echo.json(), {
      received: { secret: "client-side request", count: 7 },
    });
    assert.doesNotMatch(rawRequestBody, /client-side request/);
    assert.deepEqual(Object.keys(JSON.parse(rawRequestBody)).sort(), [
      "algorithm",
      "ciphertext",
      "iv",
      "keyId",
      "version",
    ]);

    const binary = await client.request("/test-encrypted-binary");
    assert.equal(Buffer.from(await binary.arrayBuffer()).toString("utf8"), "raw-binary-secret");
    assert.doesNotMatch(rawApplicationBody, /raw-binary-secret/);
  } finally {
    globalThis.fetch = originalFetch;
    await close();
  }
});
