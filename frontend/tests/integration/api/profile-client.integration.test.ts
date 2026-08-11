import assert from "node:assert/strict";
import test from "node:test";
import { profileClient } from "../../../src/entities/user/api/index";

test("profile entity API maps a missing profile to null", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";

  try {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ error: "missing" }), { status: 404 });
    }) as typeof globalThis.fetch;

    const profile = await profileClient.getProfile("user-404");

    assert.equal(profile, null);
    assert.match(requestedUrl, /\/api\/profiles\/user-404$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
