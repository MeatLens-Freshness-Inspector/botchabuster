import assert from "node:assert/strict";
import { test } from "node:test";
import { CsrfTokenService } from "../../../src/modules/auth/infrastructure/CsrfTokenService";

test("module CsrfTokenService binds a token to session and user", () => {
  const service = new CsrfTokenService("csrf-secret", 300, () => 1_700_000_000_000);
  const token = service.issueToken({ sessionId: "session-1", userId: "user-1" });

  assert.equal(service.verifyToken(token, { sessionId: "session-1", userId: "user-1" }), true);
  assert.equal(service.verifyToken(token, { sessionId: "session-2", userId: "user-1" }), false);
});
