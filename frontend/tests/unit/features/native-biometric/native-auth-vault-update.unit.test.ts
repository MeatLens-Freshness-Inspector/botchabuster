import assert from "node:assert/strict";
import test from "node:test";
import { createNativeAuthVault } from "../../../../src/features/native-biometric/api/native-auth-vault";
import type { NativeBiometricRecordInput } from "../../../../src/features/native-biometric/model/native-biometric-types";

const input: NativeBiometricRecordInput = {
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
    offlineUnlockRequired: false,
    passwordVerifier: null,
    localPasskey: null,
  } as never,
};

test("native vault update writes a same-user record without prompting again", async () => {
  const calls: string[] = [];
  const vault = createNativeAuthVault({
    authenticate: async (reason) => calls.push(`authenticate:${reason}`),
    readRecord: async () => "",
    writeRecord: async () => calls.push("write"),
    clearRecord: async () => undefined,
  });

  await vault.update(input);
  assert.deepEqual(calls, ["write"]);
});

test("native vault update rejects another user", async () => {
  const vault = createNativeAuthVault({
    authenticate: async () => undefined,
    readRecord: async () => "",
    writeRecord: async () => undefined,
    clearRecord: async () => undefined,
  });

  await assert.rejects(() => vault.update({ ...input, userId: "other" }), /user/i);
});
