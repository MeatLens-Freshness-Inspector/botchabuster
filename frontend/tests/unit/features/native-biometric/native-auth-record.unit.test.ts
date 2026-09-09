import assert from "node:assert/strict";
import test from "node:test";
import {
  assertNativeAuthRecord,
  parseNativeAuthRecord,
  serializeNativeAuthRecord,
  type NativeAuthRecord,
} from "../../../../src/features/native-biometric/model/native-auth-record";

const record: NativeAuthRecord = {
  version: 1,
  userId: "user-1",
  session: {
    access_token: "app-session-token",
    refresh_token: null,
    token_type: "bearer",
    expires_in: 28_800,
    expires_at: Date.now() + 28_800_000,
  },
  offlineEnvelope: {
    user: { id: "user-1", email: "user@example.com" },
    profile: { id: "user-1", full_name: "User", avatar_url: null, inspector_code: null, report_organization: null, is_dark_mode: false, show_detailed_results: true, onboarding_completed_at: null, onboarding_version: 1, email: "user@example.com", location: "Market", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
    roles: [],
    primaryRole: "inspector",
    isAdmin: false,
    isDeveloper: false,
    authenticatedAt: "2026-09-09T00:00:00.000Z",
    offlineExpiresAt: "2026-09-10T00:00:00.000Z",
    offlineUnlockRequired: false,
    passwordVerifier: null,
    localPasskey: null,
  },
  authenticatedAt: "2026-09-09T00:00:00.000Z",
  expiresAt: "2026-09-10T00:00:00.000Z",
};

test("native auth records round-trip through JSON", () => {
  assert.deepEqual(parseNativeAuthRecord(serializeNativeAuthRecord(record)), record);
});

test("native auth records reject malformed or unsupported data", () => {
  assert.throws(() => parseNativeAuthRecord("not-json"), /invalid/i);
  assert.throws(() => parseNativeAuthRecord(JSON.stringify({ ...record, version: 2 })), /version/i);
  assert.throws(() => parseNativeAuthRecord(JSON.stringify({ ...record, userId: "other" })), /user/i);
});

test("native auth record assertions reject mismatched envelope users", () => {
  assert.throws(() => assertNativeAuthRecord({ ...record, offlineEnvelope: { ...record.offlineEnvelope, user: { id: "other", email: null } } }), /user/i);
});
