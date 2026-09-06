import assert from "node:assert/strict";
import test from "node:test";
import { modelAccuracyClient } from "../../../src/entities/model-accuracy/api/model-accuracy-client";
import { installEncryptedFetch } from "../../support/encrypted-fetch";

test("model accuracy client requests a bounded authenticated history range", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  const restoreTransportFetch = installEncryptedFetch(({ input, init }) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify([]), { status: 200 });
  });

  try {
    await modelAccuracyClient.getHistory("2026-08-01", "2026-08-31");
  } finally {
    restoreTransportFetch();
  }

  assert.match(requestUrl, /\/api\/model-accuracy\/history\?startDate=2026-08-01&endDate=2026-08-31$/);
  assert.equal(new Headers(requestInit?.headers).get("Authorization"), null);
  assert.equal(requestInit?.credentials, "include");
});

test("model accuracy client rejects malformed snapshot responses", async () => {
  const restoreTransportFetch = installEncryptedFetch(() => new Response(JSON.stringify([
    { id: "snapshot-1", observedAccuracy: "not-a-number" },
  ]), { status: 200 }));

  try {
    await assert.rejects(modelAccuracyClient.getHistory("2026-08-01", "2026-08-31"), /invalid snapshot/i);
  } finally {
    restoreTransportFetch();
  }
});
