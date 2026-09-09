import assert from "node:assert/strict";
import test from "node:test";
import {
  createNativeAuthVault,
  type NativeAuthVaultDependencies,
} from "../../../../src/features/native-biometric/api/native-auth-vault";
import { parseNativeAuthRecord } from "../../../../src/features/native-biometric/model/native-auth-record";
import type { OfflineAuthEnvelope } from "../../../../src/entities/user/model/offline-auth-envelope";

const envelope = {
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
} as unknown as OfflineAuthEnvelope;

function createDependencies() {
  const calls: string[] = [];
  let stored = "";
  const dependencies: NativeAuthVaultDependencies = {
    authenticate: async (reason) => calls.push(`authenticate:${reason}`),
    readRecord: async () => stored,
    writeRecord: async (record) => {
      calls.push("write");
      stored = record;
    },
    clearRecord: async () => {
      calls.push("clear");
      stored = "";
    },
  };
  return { calls, dependencies, getStored: () => stored };
}

test("enrollment authenticates before writing a validated native record", async () => {
  const fixture = createDependencies();
  const vault = createNativeAuthVault(fixture.dependencies);

  await vault.enroll({ userId: "user-1", session: null, offlineEnvelope: envelope });

  assert.deepEqual(fixture.calls, ["authenticate:enroll", "write"]);
  assert.equal(parseNativeAuthRecord(fixture.getStored()).userId, "user-1");
});

test("enrollment rejects mismatched user data before prompting", async () => {
  const fixture = createDependencies();
  const vault = createNativeAuthVault(fixture.dependencies);

  await assert.rejects(
    () => vault.enroll({ userId: "other", session: null, offlineEnvelope: envelope }),
    /user/i,
  );
  assert.deepEqual(fixture.calls, []);
});
