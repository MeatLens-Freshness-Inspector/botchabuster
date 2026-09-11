import assert from "node:assert/strict";
import test from "node:test";
import { signInWithNativeBiometricSession } from "../../../../src/features/native-biometric/model/native-provider-actions";
import type { NativeProviderActionDependencies } from "../../../../src/features/native-biometric/model/native-provider-actions";

const record = {
  version: 1,
  userId: "user-1",
  session: null,
  offlineEnvelope: {
    user: { id: "user-1", email: "user@example.com" },
    profile: { id: "user-1" },
    roles: [],
    primaryRole: "inspector",
    isAdmin: true,
    isDeveloper: false,
    authenticatedAt: "2098-12-31T00:00:00.000Z",
    offlineExpiresAt: "2099-01-01T00:00:00.000Z",
    offlineUnlockRequired: false,
    passwordVerifier: null,
    localPasskey: null,
  },
  authenticatedAt: "2098-12-31T00:00:00.000Z",
  expiresAt: "2099-01-01T00:00:00.000Z",
} as never;

function createDependencies(overrides: Partial<NativeProviderActionDependencies> = {}) {
  return {
    vault: {
      unlock: async () => record,
    },
    isOnline: () => true,
    loadEnvelope: async () => record.offlineEnvelope,
    restoreOnline: async () => ({ status: "online", payload: { isAdmin: true } as never }),
    unlockOffline: async (envelope: never) => envelope,
    applyOnline: async () => undefined,
    ...overrides,
  } as NativeProviderActionDependencies;
}

test("native sign-in applies a fresh online bootstrap when available", async () => {
  let applied = false;
  const result = await signInWithNativeBiometricSession(createDependencies({
    applyOnline: async () => {
      applied = true;
    },
  }));

  assert.deepEqual(result, { isAdmin: true, mode: "online" });
  assert.equal(applied, true);
});

test("native sign-in unlocks the cached envelope when offline", async () => {
  let unlocked = false;
  const result = await signInWithNativeBiometricSession(createDependencies({
    isOnline: () => false,
    unlockOffline: async (envelope) => {
      unlocked = true;
      return envelope;
    },
  }));

  assert.deepEqual(result, { isAdmin: true, mode: "offline" });
  assert.equal(unlocked, true);
});

test("native sign-in falls back to the cached envelope if online restore expires", async () => {
  let unlocked = false;
  const result = await signInWithNativeBiometricSession(createDependencies({
    restoreOnline: async () => ({ status: "expired" }),
    unlockOffline: async (envelope) => {
      unlocked = true;
      return envelope;
    },
  }));

  assert.deepEqual(result, { isAdmin: true, mode: "offline" });
  assert.equal(unlocked, true);
});
