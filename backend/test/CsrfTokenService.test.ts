import assert from "node:assert/strict";
import test from "node:test";
import { CsrfTokenService } from "../src/services/CsrfTokenService";

test("issues and verifies a csrf token bound to the app session and user", () => {
  const csrfService = new CsrfTokenService("csrf-secret", 900, () => 1_700_000_000_000);

  const token = csrfService.issueToken({
    sessionId: "session-1",
    userId: "user-1",
  });

  assert.equal(
    csrfService.verifyToken(token, {
      sessionId: "session-1",
      userId: "user-1",
    }),
    true,
  );
});

test("rejects csrf tokens that are tampered with, expired, or bound to another session", () => {
  const issuedAt = 1_700_000_000_000;
  const csrfService = new CsrfTokenService("csrf-secret", 900, () => issuedAt);
  const token = csrfService.issueToken({
    sessionId: "session-1",
    userId: "user-1",
  });

  assert.equal(
    csrfService.verifyToken(`${token}tampered`, {
      sessionId: "session-1",
      userId: "user-1",
    }),
    false,
  );

  assert.equal(
    csrfService.verifyToken(token, {
      sessionId: "session-2",
      userId: "user-1",
    }),
    false,
  );

  const expiredVerifier = new CsrfTokenService("csrf-secret", 900, () => issuedAt + 901_000);
  assert.equal(
    expiredVerifier.verifyToken(token, {
      sessionId: "session-1",
      userId: "user-1",
    }),
    false,
  );
});
