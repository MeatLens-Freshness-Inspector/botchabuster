import assert from "node:assert/strict";
import test from "node:test";
import { SessionLimitService } from "../src/services/SessionLimitService";

// Helper to build a fake in-memory store (no DB required for unit tests)
function makeService(limit = 2) {
  return new SessionLimitService(limit);
}

test("allows the first session for a user", async () => {
  const svc = makeService(2);
  await svc.registerSession("user-1", "token-a", futureExpiry());
  const count = await svc.countActiveSessions("user-1");
  assert.equal(count, 1);
});

test("allows up to the configured limit", async () => {
  const svc = makeService(2);
  await svc.registerSession("user-1", "token-a", futureExpiry());
  await svc.registerSession("user-1", "token-b", futureExpiry());
  const count = await svc.countActiveSessions("user-1");
  assert.equal(count, 2);
});

test("isAtLimit returns false when below limit", async () => {
  const svc = makeService(2);
  await svc.registerSession("user-1", "token-a", futureExpiry());
  assert.equal(await svc.isAtLimit("user-1"), false);
});

test("isAtLimit returns true when at or above limit", async () => {
  const svc = makeService(2);
  await svc.registerSession("user-1", "token-a", futureExpiry());
  await svc.registerSession("user-1", "token-b", futureExpiry());
  assert.equal(await svc.isAtLimit("user-1"), true);
});

test("removeSession decrements the active session count", async () => {
  const svc = makeService(2);
  await svc.registerSession("user-1", "token-a", futureExpiry());
  await svc.registerSession("user-1", "token-b", futureExpiry());
  await svc.removeSession("token-a");
  assert.equal(await svc.countActiveSessions("user-1"), 1);
  assert.equal(await svc.isAtLimit("user-1"), false);
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
  await svc.pruneExpiredSessions("user-1");
  assert.equal(await svc.countActiveSessions("user-1"), 1);
});

test("sessions are isolated per user", async () => {
  const svc = makeService(2);
  await svc.registerSession("user-1", "token-a", futureExpiry());
  await svc.registerSession("user-1", "token-b", futureExpiry());
  await svc.registerSession("user-2", "token-c", futureExpiry());

  assert.equal(await svc.isAtLimit("user-1"), true);
  assert.equal(await svc.isAtLimit("user-2"), false);
  assert.equal(await svc.countActiveSessions("user-2"), 1);
});

test("limit of 1 only allows a single session", async () => {
  const svc = makeService(1);
  await svc.registerSession("user-1", "token-a", futureExpiry());
  assert.equal(await svc.isAtLimit("user-1"), true);
});

// ---- helpers ----

function futureExpiry(): number {
  return Math.floor(Date.now() / 1000) + 3600; // 1 hour from now (Unix seconds)
}
