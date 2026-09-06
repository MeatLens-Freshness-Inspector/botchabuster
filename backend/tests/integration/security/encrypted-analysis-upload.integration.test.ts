import assert from "node:assert/strict";
import test from "node:test";
import "../../setup/env";
import { getEncryptedTestClient } from "../../support/requestFactory";
import { startTestServer } from "../../support/appFactory";

test("analysis receives an encrypted image transport file", async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    const client = await getEncryptedTestClient(baseUrl);
    const formData = new FormData();
    formData.append("image", new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }), "sample.png");

    const response = await client.request("/api/analysis/analyze", {
      method: "POST",
      body: formData,
    });

    assert.equal(response.status, 410);
    assert.match((await response.json() as { error?: string }).error ?? "", /retired/i);
  } finally {
    await close();
  }
});

test("analysis rejects an encrypted request without an image file", async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    const client = await getEncryptedTestClient(baseUrl);
    const response = await client.json("/api/analysis/analyze", {}, { method: "POST" });

    assert.equal(response.status, 400);
    assert.match((await response.json() as { error?: string }).error ?? "", /image file/i);
  } finally {
    await close();
  }
});
