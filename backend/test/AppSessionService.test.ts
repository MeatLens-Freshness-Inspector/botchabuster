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
