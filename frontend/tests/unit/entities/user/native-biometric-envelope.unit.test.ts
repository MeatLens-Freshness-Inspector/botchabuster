import assert from "node:assert/strict";
import test from "node:test";
import {
  createNativeAuthRecordFromBootstrap,
  isNativeRecordExpired,
  restoreOfflineEnvelopeFromNativeRecord,
} from "../../../../src/entities/user/model/native-biometric-envelope";
import type { AuthBootstrapPayload } from "../../../../src/features/auth/api/auth-client";
import type { OfflineAuthEnvelope } from "../../../../src/entities/user/model/offline-auth-envelope";
import type { NativeAuthRecord } from "../../../../src/features/native-biometric/model/native-auth-record";

const envelope = {
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
} as unknown as OfflineAuthEnvelope;

const payload = {
  user: envelope.user,
  profile: envelope.profile,
  session: null,
  roles: [],
  primaryRole: "inspector",
  isAdmin: false,
  isDeveloper: false,
  csrfToken: "csrf",
  authenticatedAt: envelope.authenticatedAt,
  offlineExpiresAt: envelope.offlineExpiresAt,
} as unknown as AuthBootstrapPayload;

test("native records carry the accepted online bootstrap and protected offline envelope", () => {
  const record = createNativeAuthRecordFromBootstrap(payload, envelope);
  assert.equal(record.userId, "user-1");
  assert.equal(record.offlineEnvelope.offlineExpiresAt, envelope.offlineExpiresAt);
});

test("native records expire when either native or offline expiry is reached", () => {
  const record = createNativeAuthRecordFromBootstrap(payload, envelope);
  assert.equal(isNativeRecordExpired(record, Date.parse("2026-09-09T12:00:00.000Z")), false);
  assert.equal(isNativeRecordExpired(record, Date.parse("2026-09-10T00:00:00.000Z")), true);
});

test("native offline restore unlocks only after record validation", () => {
  const record = createNativeAuthRecordFromBootstrap(payload, envelope);
  const restored = restoreOfflineEnvelopeFromNativeRecord(record as NativeAuthRecord);
  assert.equal(restored.offlineUnlockRequired, false);
  assert.equal(restored.user.id, "user-1");
});
