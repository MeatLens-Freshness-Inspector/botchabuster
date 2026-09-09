import assert from "node:assert/strict";
import test from "node:test";
import {
  createNativeAuthVault,
} from "../../../../src/features/native-biometric/api/native-auth-vault";
import {
  serializeNativeAuthRecord,
  type NativeAuthRecord,
} from "../../../../src/features/native-biometric/model/native-auth-record";

const record: NativeAuthRecord = {
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
    offlineUnlockRequired: false,
    passwordVerifier: null,
    localPasskey: null,
  } as never,
  authenticatedAt: "2026-09-09T00:00:00.000Z",
  expiresAt: "2026-09-10T00:00:00.000Z",
};

test("unlock authenticates before reading and returns a validated record", async () => {
  const calls: string[] = [];
  const vault = createNativeAuthVault({
    authenticate: async (reason) => calls.push(`authenticate:${reason}`),
    readRecord: async () => {
      calls.push("read");
      return serializeNativeAuthRecord(record);
    },
    writeRecord: async () => undefined,
    clearRecord: async () => undefined,
  });

  const unlocked = await vault.unlock("login");
  assert.equal(unlocked.userId, "user-1");
  assert.deepEqual(calls, ["authenticate:login", "read"]);
});

test("unlock maps malformed data to a recoverable corrupt-vault error", async () => {
  const vault = createNativeAuthVault({
    authenticate: async () => undefined,
    readRecord: async () => "bad-record",
    writeRecord: async () => undefined,
    clearRecord: async () => undefined,
  });

  await assert.rejects(() => vault.unlock("unlock"), (error: unknown) => {
    return error instanceof Error && "code" in error && error.code === "vault-corrupt";
  });
});
