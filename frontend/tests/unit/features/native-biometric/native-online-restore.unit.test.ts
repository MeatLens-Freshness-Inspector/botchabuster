import assert from "node:assert/strict";
import test from "node:test";
import {
  restoreNativeOnlineSession,
  type NativeOnlineRestoreDependencies,
} from "../../../../src/features/native-biometric/model/native-online-restore";
import type { NativeAuthRecord } from "../../../../src/features/native-biometric/model/native-auth-record";

const record = {
  version: 1,
  userId: "user-1",
  session: {
    access_token: "token",
    refresh_token: null,
    token_type: "bearer",
    expires_in: 28_800,
    expires_at: Date.now() + 28_800_000,
  },
  offlineEnvelope: { user: { id: "user-1", email: "user@example.com" } },
  authenticatedAt: "2026-09-09T00:00:00.000Z",
  expiresAt: "2026-09-10T00:00:00.000Z",
} as unknown as NativeAuthRecord;

test("native online restore installs the session before fetching fresh bootstrap", async () => {
  const calls: string[] = [];
  const dependencies: NativeOnlineRestoreDependencies = {
    setSession: (session) => calls.push(`session:${session.access_token}`),
    getSession: async () => {
      calls.push("get-session");
      return { user: { id: "user-1" } } as never;
    },
    clearSession: () => calls.push("clear-session"),
  };

  const result = await restoreNativeOnlineSession(record, dependencies);
  assert.equal(result.status, "online");
  assert.deepEqual(calls, ["session:token", "get-session"]);
});

test("native online restore falls back when the stored credential is expired", async () => {
  const dependencies: NativeOnlineRestoreDependencies = {
    setSession: () => assert.fail("expired session must not be installed"),
    getSession: async () => assert.fail("expired session must not call backend"),
    clearSession: () => undefined,
  };

  const result = await restoreNativeOnlineSession({ ...record, session: null }, dependencies);
  assert.deepEqual(result, { status: "expired" });
});
