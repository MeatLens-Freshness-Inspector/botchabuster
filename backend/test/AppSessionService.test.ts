import assert from "node:assert/strict";
import test from "node:test";
import { AppSessionService } from "../src/services/AppSessionService";

test("creates a MeatLens app session and resolves the user from its access token", async () => {
  const issuedAt = Date.UTC(2026, 5, 20, 10, 0, 0);
  const sessionService = new AppSessionService("top-secret", 3600, () => issuedAt);

  const session = sessionService.createSession({
    id: "user-1",
    email: "inspector@example.com",
  });

  assert.equal(session.refresh_token, null);
  assert.equal(session.token_type, "bearer");
  assert.equal(session.expires_in, 3600);
  assert.ok(session.access_token);

  const resolvedUser = await sessionService.getUserFromAccessToken(session.access_token!);
  assert.deepEqual(resolvedUser, {
    id: "user-1",
    email: "inspector@example.com",
  });
});

test("rejects expired or tampered app sessions", async () => {
  const issuedAt = Date.UTC(2026, 5, 20, 10, 0, 0);
  const sessionService = new AppSessionService("top-secret", 300, () => issuedAt);
  const session = sessionService.createSession({
    id: "user-2",
    email: "admin@example.com",
  });

  const tamperedToken = `${session.access_token!}tampered`;
  await assert.rejects(
    async () => sessionService.getUserFromAccessToken(tamperedToken),
    /invalid or expired access token/i,
  );

  const expiredVerifier = new AppSessionService("top-secret", 300, () => issuedAt + 301_000);
  await assert.rejects(
    async () => expiredVerifier.getUserFromAccessToken(session.access_token!),
    /invalid or expired access token/i,
  );
});

test("getSessionId returns a unique stable ID embedded in each token", () => {
  const issuedAt = Date.UTC(2026, 5, 20, 10, 0, 0);
  const sessionService = new AppSessionService("top-secret", 3600, () => issuedAt);

  const session1 = sessionService.createSession({ id: "user-4", email: "a@example.com" });
  const session2 = sessionService.createSession({ id: "user-4", email: "a@example.com" });

  const jti1 = sessionService.getSessionId(session1.access_token!);
  const jti2 = sessionService.getSessionId(session2.access_token!);

  assert.ok(jti1, "jti1 should be a non-empty string");
  assert.ok(jti2, "jti2 should be a non-empty string");
  assert.notEqual(jti1, jti2, "each session token must have a unique jti");
  assert.equal(sessionService.getSessionId(session1.access_token!), jti1);
});

test("getSessionId returns null for non-app-session or malformed tokens", () => {
  const sessionService = new AppSessionService("top-secret", 3600);
  assert.equal(sessionService.getSessionId(""), null);
  assert.equal(sessionService.getSessionId("not.a.jwt"), null);
  assert.equal(sessionService.getSessionId("eyJ.eyJ.sig"), null);
});
