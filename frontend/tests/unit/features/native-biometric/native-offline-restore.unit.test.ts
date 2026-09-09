import assert from "node:assert/strict";
import test from "node:test";
import {
  restoreNativeOfflineSession,
} from "../../../../src/features/native-biometric/model/native-offline-restore";
import type { NativeAuthRecord } from "../../../../src/features/native-biometric/model/native-auth-record";

const record = {
  version: 1,
  userId: "user-1",
  session: null,
  offlineEnvelope: {
    user: { id: "user-1", email: "user@example.com" },
    profile: { id: "user-1" },
    roles: [],
    primaryRole: "inspector",
    isAdmin: false,
    isDeveloper: false,
    authenticatedAt: "2026-09-09T00:00:00.000Z",
    offlineExpiresAt: "2026-09-10T00:00:00.000Z",
    offlineUnlockRequired: true,
    passwordVerifier: null,
    localPasskey: null,
  },
  authenticatedAt: "2026-09-09T00:00:00.000Z",
  expiresAt: "2026-09-10T00:00:00.000Z",
} as unknown as NativeAuthRecord;

test("native offline restore returns an unlocked envelope before expiry", () => {
  const restored = restoreNativeOfflineSession(record, Date.parse("2026-09-09T12:00:00.000Z"));
  assert.equal(restored.offlineUnlockRequired, false);
  assert.equal(restored.user.id, "user-1");
});

test("native offline restore rejects an expired record", () => {
  assert.throws(
    () => restoreNativeOfflineSession(record, Date.parse("2026-09-10T00:00:00.000Z")),
    /expired/i,
  );
});
