import assert from "node:assert/strict";
import test from "node:test";
import {
  createCapacitorNativeBiometricAdapter,
} from "../../../../src/features/native-biometric/api/capacitor-native-biometric";

test("capacitor adapter maps enrolled fingerprint availability", async () => {
  const adapter = createCapacitorNativeBiometricAdapter({
    checkBiometry: async () => ({
      isAvailable: true,
      deviceIsSecure: true,
      biometryType: "fingerprintAuthentication",
    }),
    authenticate: async () => undefined,
    get: async () => null,
    set: async () => undefined,
    remove: async () => true,
  });

  assert.deepEqual(await adapter.checkAvailability(), {
    isNative: true,
    isAvailable: true,
    isEnrolled: true,
    label: "fingerprint",
  });
});

test("capacitor adapter authenticates before reading a record", async () => {
  const calls: string[] = [];
  const adapter = createCapacitorNativeBiometricAdapter({
    checkBiometry: async () => ({
      isAvailable: true,
      deviceIsSecure: true,
      biometryType: "faceId",
    }),
    authenticate: async () => {
      calls.push("authenticate");
    },
    get: async () => {
      calls.push("get");
      return "record";
    },
    set: async () => undefined,
    remove: async () => true,
  });

  assert.equal(await adapter.readRecord(), "record");
  assert.deepEqual(calls, ["authenticate", "get"]);
});

test("capacitor adapter reports whether a secure record exists", async () => {
  const adapter = createCapacitorNativeBiometricAdapter({
    checkBiometry: async () => ({ isAvailable: false, deviceIsSecure: false, biometryType: "none" }),
    authenticate: async () => undefined,
    get: async () => "record",
    set: async () => undefined,
    remove: async () => true,
  });

  assert.equal(await adapter.hasRecord(), true);
});
