import assert from "node:assert/strict";
import test from "node:test";
import { restoreNativeOnReconnect } from "../../../src/features/native-biometric/model/native-reconnect";
import type { NativeAuthRecord } from "../../../src/features/native-biometric/model/native-auth-record";

const record = { userId: "user-1", session: null } as unknown as NativeAuthRecord;

test("reconnect ignores anonymous and online-authenticated states", async () => {
  const result = await restoreNativeOnReconnect("anonymous", record, {
    isOnline: () => true,
    restoreOnline: async () => assert.fail("anonymous should not restore"),
    restoreOffline: () => assert.fail("anonymous should not restore"),
  });
  assert.deepEqual(result, { status: "ignored" });
});

test("reconnect upgrades an offline state when the stored session is valid", async () => {
  const result = await restoreNativeOnReconnect("offline-authenticated", record, {
    isOnline: () => true,
    restoreOnline: async () => ({ status: "online", payload: { user: { id: "user-1" } } } as never),
    restoreOffline: () => assert.fail("online restore should win"),
  });
  assert.equal(result.status, "online");
});

test("reconnect keeps a safe offline state when online restoration fails", async () => {
  const result = await restoreNativeOnReconnect("offline-locked", record, {
    isOnline: () => false,
    restoreOnline: async () => assert.fail("offline reconnect must not call online"),
    restoreOffline: () => ({ status: "offline", envelope: { user: { id: "user-1" } } } as never),
  });
  assert.equal(result.status, "offline");
});
