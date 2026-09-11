import assert from "node:assert/strict";
import test from "node:test";
import {
  enrollNativeBiometricSession,
  signInWithNativeBiometricSession,
  type NativeProviderActionDependencies,
} from "../../../src/features/native-biometric/model/native-provider-actions";
import type { OfflineAuthEnvelope } from "../../../src/entities/user/model/offline-auth-envelope";

const envelope = {
  user: { id: "user-1", email: "user@example.com" },
  profile: { id: "user-1" },
  roles: [],
  primaryRole: "inspector",
  isAdmin: false,
  isDeveloper: false,
  authenticatedAt: "2098-12-31T00:00:00.000Z",
  offlineExpiresAt: "2099-01-01T00:00:00.000Z",
  offlineUnlockRequired: false,
  passwordVerifier: null,
  localPasskey: null,
} as unknown as OfflineAuthEnvelope;

function createDependencies(overrides: Partial<NativeProviderActionDependencies> = {}) {
  const calls: string[] = [];
  const dependencies: NativeProviderActionDependencies = {
    vault: {
      enroll: async () => calls.push("enroll"),
      unlock: async () => ({
        version: 1,
        userId: "user-1",
        session: null,
        offlineEnvelope: envelope,
        authenticatedAt: envelope.authenticatedAt,
        expiresAt: envelope.offlineExpiresAt,
      }),
      update: async () => undefined,
      clear: async () => undefined,
      clearAfterCorruption: async () => undefined,
    },
    isOnline: () => false,
    loadEnvelope: async () => envelope,
    restoreOnline: async () => ({ status: "expired" }),
    unlockOffline: async (nextEnvelope) => {
      calls.push("offline");
      return nextEnvelope;
    },
    applyOnline: async () => calls.push("online"),
    ...overrides,
  };
  return { calls, dependencies };
}

test("provider enrollment requires a current session and matching envelope", async () => {
  const fixture = createDependencies();
  await enrollNativeBiometricSession(
    { userId: "user-1", session: null },
    fixture.dependencies,
  ).catch((error: unknown) => assert.match(String(error), /online session/i));
  assert.deepEqual(fixture.calls, []);
});

test("provider native sign-in unlocks offline mode when online restore is unavailable", async () => {
  const fixture = createDependencies();
  const result = await signInWithNativeBiometricSession(fixture.dependencies);
  assert.deepEqual(result, { isAdmin: false, mode: "offline" });
  assert.deepEqual(fixture.calls, ["offline"]);
});
