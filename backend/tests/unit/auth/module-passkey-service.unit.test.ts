import assert from "node:assert/strict";
import { test } from "node:test";
import { PasskeyService } from "../../../src/modules/auth/infrastructure/PasskeyService";

test("module PasskeyService creates an authentication ceremony for the origin", async () => {
  const result = await new PasskeyService().beginAuthentication("https://example.com");

  assert.equal(typeof result.challengeId, "string");
  assert.equal(result.options.rpId, "example.com");
});
