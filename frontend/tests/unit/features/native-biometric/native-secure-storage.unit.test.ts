import assert from "node:assert/strict";
import test from "node:test";
import {
  createNativeSecureStorage,
  type NativeSecureStorageDependencies,
} from "../../../../src/features/native-biometric/api/native-secure-storage";

test("native secure storage configures a device-only auth namespace", async () => {
  const calls: string[] = [];
  const dependencies: NativeSecureStorageDependencies = {
    setKeyPrefix: async (prefix) => calls.push(`prefix:${prefix}`),
    setSynchronize: async (sync) => calls.push(`sync:${sync}`),
    setDefaultKeychainAccess: async (access) => calls.push(`access:${access}`),
    get: async () => "record",
    set: async () => undefined,
    remove: async () => true,
  };

  const storage = createNativeSecureStorage(dependencies);
  await storage.configure();
  assert.deepEqual(calls, ["prefix:meatlens_", "sync:false", "access:whenPasscodeSetThisDeviceOnly"]);
});

test("native secure storage delegates string values and removal", async () => {
  const values = new Map<string, string>();
  const storage = createNativeSecureStorage({
    setKeyPrefix: async () => undefined,
    setSynchronize: async () => undefined,
    setDefaultKeychainAccess: async () => undefined,
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => values.set(key, value),
    remove: async (key) => values.delete(key),
  });

  await storage.set("auth-record", "payload");
  assert.equal(await storage.get("auth-record"), "payload");
  await storage.remove("auth-record");
  assert.equal(await storage.get("auth-record"), null);
});
