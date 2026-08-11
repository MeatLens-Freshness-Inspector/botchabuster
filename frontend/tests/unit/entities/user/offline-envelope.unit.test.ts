import assert from "node:assert/strict";
import { test } from "node:test";
import { isOfflineAuthExpired } from "../../../../src/entities/user/model/offline-auth-envelope";

test("offline auth envelope expires at its absolute deadline", () => {
  assert.equal(isOfflineAuthExpired({ offlineExpiresAt: "2026-01-01T00:00:00.000Z" }, Date.parse("2026-01-01T00:00:01.000Z")), true);
  assert.equal(isOfflineAuthExpired({ offlineExpiresAt: "2026-01-01T00:00:00.000Z" }, Date.parse("2025-12-31T23:59:59.000Z")), false);
});
