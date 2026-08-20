import assert from "node:assert/strict";
import test from "node:test";
import { SessionLimitService } from "../../../src/modules/auth/infrastructure/SessionLimitService";

// Helper to build a fake in-memory store (no DB required for unit tests)
function makeService(limit = 2) {
  return new SessionLimitService(limit);
}

test("allows the first session for a user", async () => {
  const svc = makeService(2);
  await svc.registerSession("user-1", "token-a", futureExpiry());
  const count = await svc.countActiveSessions("user-1", 900);
  assert.equal(count, 1);
});

test("allows up to the configured limit", async () => {
  const svc = makeService(2);
  await svc.registerSession("user-1", "token-a", futureExpiry());
  await svc.registerSession("user-1", "token-b", futureExpiry());
  const count = await svc.countActiveSessions("user-1", 900);
  assert.equal(count, 2);
});

test("isAtLimit returns false when below limit", async () => {
  const svc = makeService(2);
  await svc.registerSession("user-1", "token-a", futureExpiry());
  assert.equal(await svc.isAtLimit("user-1", 900), false);
});

test("isAtLimit returns true when at or above limit", async () => {
  const svc = makeService(2);
  await svc.registerSession("user-1", "token-a", futureExpiry());
  await svc.registerSession("user-1", "token-b", futureExpiry());
  assert.equal(await svc.isAtLimit("user-1", 900), true);
});

test("removeSession decrements the active session count", async () => {
  const svc = makeService(2);
  await svc.registerSession("user-1", "token-a", futureExpiry());
  await svc.registerSession("user-1", "token-b", futureExpiry());
  await svc.removeSession("token-a");
  assert.equal(await svc.countActiveSessions("user-1", 900), 1);
  assert.equal(await svc.isAtLimit("user-1", 900), false);
});

test("hasSession returns true only for active tracked tokens", async () => {
  const svc = makeService(2);
  const expiredAt = Math.floor(Date.now() / 1000) - 1;
  await svc.registerSession("user-1", "token-old", expiredAt);
  await svc.registerSession("user-1", "token-new", futureExpiry());

  assert.equal(await svc.hasSession("token-old"), false);
  assert.equal(await svc.hasSession("token-new"), true);
});

test("registering the same token twice is idempotent", async () => {
  const svc = makeService(2);
  await svc.registerSession("user-1", "token-a", futureExpiry());
  await svc.registerSession("user-1", "token-a", futureExpiry());

  assert.equal(await svc.countActiveSessions("user-1", 900), 1);
  assert.equal(await svc.hasSession("token-a"), true);
});

test("removeSession is a no-op for unknown tokens", async () => {
  const svc = makeService(2);
  // Should not throw
  await assert.doesNotReject(() => svc.removeSession("unknown-token"));
});

test("expired sessions are not counted as active", async () => {
  const svc = makeService(2);
  const pastExpiry = Math.floor(Date.now() / 1000) - 1; // 1 second ago
  await svc.registerSession("user-1", "token-old", pastExpiry);
  await svc.registerSession("user-1", "token-new", futureExpiry());
  await svc.pruneInactiveSessions("user-1", 900);
  assert.equal(await svc.countActiveSessions("user-1", 900), 1);
});

test("sessions are isolated per user", async () => {
  const svc = makeService(2);
  await svc.registerSession("user-1", "token-a", futureExpiry());
  await svc.registerSession("user-1", "token-b", futureExpiry());
  await svc.registerSession("user-2", "token-c", futureExpiry());

  assert.equal(await svc.isAtLimit("user-1", 900), true);
  assert.equal(await svc.isAtLimit("user-2", 900), false);
  assert.equal(await svc.countActiveSessions("user-2", 900), 1);
});

test("limit of 1 only allows a single session", async () => {
  const svc = makeService(1);
  await svc.registerSession("user-1", "token-a", futureExpiry());
  assert.equal(await svc.isAtLimit("user-1", 900), true);
});

test("touchSession accepts an active token and refreshes its last-seen state", async () => {
  let nowMs = 1_700_000_000_000;
  const svc = new SessionLimitService(2, false, () => nowMs);
  const nowSeconds = Math.floor(nowMs / 1000);

  await svc.registerSession("user-1", "token-active", nowSeconds + 3600);

  nowMs += 599 * 1000;
  assert.equal(await svc.touchSession("token-active", 600), true);

  nowMs += 599 * 1000;
  assert.equal(await svc.touchSession("token-active", 600), true);
});

test("touchSession rejects and removes an idle token", async () => {
  let nowMs = 1_700_000_000_000;
  const svc = new SessionLimitService(2, false, () => nowMs);
  const nowSeconds = Math.floor(nowMs / 1000);

  await svc.registerSession("user-1", "token-idle", nowSeconds + 3600);
  nowMs += 601 * 1000;

  assert.equal(await svc.touchSession("token-idle", 600), false);
  assert.equal(await svc.hasSession("token-idle"), false);
});

test("removeInactiveSessions deletes idle and absolutely expired tokens", async () => {
  let nowMs = 1_700_000_000_000;
  const svc = new SessionLimitService(3, false, () => nowMs);
  const initialSeconds = Math.floor(nowMs / 1000);

  await svc.registerSession("user-1", "token-idle", initialSeconds + 3600);
  nowMs += 601 * 1000;
  const currentSeconds = Math.floor(nowMs / 1000);
  await svc.registerSession("user-1", "token-expired", currentSeconds - 1);

  assert.equal(await svc.removeInactiveSessions(600), 2);
  assert.equal(await svc.countActiveSessions("user-1", 600), 0);
});

test("idle sessions neither count toward nor block a device slot", async () => {
  let nowMs = 1_700_000_000_000;
  const svc = new SessionLimitService(1, false, () => nowMs);
  const initialSeconds = Math.floor(nowMs / 1000);

  await svc.registerSession("user-1", "token-idle", initialSeconds + 3600);
  nowMs += 601 * 1000;

  assert.equal(await svc.countActiveSessions("user-1", 600), 0);
  assert.equal(await svc.isAtLimit("user-1", 600), false);
});

test("pruneInactiveSessions removes only the requested user's idle and expired sessions", async () => {
  let nowMs = 1_700_000_000_000;
  const svc = new SessionLimitService(3, false, () => nowMs);
  const initialSeconds = Math.floor(nowMs / 1000);

  await svc.registerSession("user-1", "user-one-idle", initialSeconds + 3600);
  await svc.registerSession("user-2", "user-two-idle", initialSeconds + 3600);
  nowMs += 601 * 1000;

  await svc.pruneInactiveSessions("user-1", 600);

  assert.equal(await svc.hasSession("user-one-idle"), false);
  assert.equal(await svc.hasSession("user-two-idle"), true);
});

// ---- helpers ----

function futureExpiry(): number {
  return Math.floor(Date.now() / 1000) + 3600; // 1 hour from now (Unix seconds)
}
