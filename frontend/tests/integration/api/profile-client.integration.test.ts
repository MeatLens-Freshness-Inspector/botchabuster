import assert from "node:assert/strict";
import test from "node:test";
import { profileClient } from "../../../src/entities/user/api/index";
import { installEncryptedFetch } from "../../support/encrypted-fetch";

test("profile entity API maps a missing profile to null", async () => {
  const restoreTransportFetch = installEncryptedFetch(({ input }) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({ error: "missing" }), { status: 404 });
  });
  let requestedUrl = "";

  try {
    const profile = await profileClient.getProfile("user-404");

    assert.equal(profile, null);
    assert.match(requestedUrl, /\/api\/profiles\/user-404$/);
  } finally {
    restoreTransportFetch();
  }
});
