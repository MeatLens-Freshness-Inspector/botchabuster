import assert from "node:assert/strict";
import test from "node:test";
import type {
  NativeBiometricAdapter,
  NativeBiometricAvailability,
  NativeBiometricErrorCode,
} from "../../../../src/features/native-biometric/model/native-biometric-types";
import { NATIVE_BIOMETRIC_ERROR_CODES } from "../../../../src/features/native-biometric/model/native-biometric-types";

test("native biometric availability has a stable public shape", () => {
  const availability: NativeBiometricAvailability = {
    isNative: true,
    isAvailable: true,
    isEnrolled: true,
    label: "fingerprint",
  };

  assert.equal(availability.label, "fingerprint");
  assert.equal(availability.isAvailable, true);
});

test("native biometric adapter exposes the complete vault boundary", () => {
  const adapter: NativeBiometricAdapter = {
    checkAvailability: async () => ({
      isNative: false,
      isAvailable: false,
      isEnrolled: false,
      label: "unavailable",
    }),
    hasRecord: async () => false,
    authenticate: async () => undefined,
    readRecord: async () => "",
    writeRecord: async () => undefined,
    clearRecord: async () => undefined,
  };

  assert.equal(typeof adapter.checkAvailability, "function");
  assert.equal(typeof adapter.clearRecord, "function");
});

test("native biometric error codes are constrained to safe categories", () => {
  const code: NativeBiometricErrorCode = "cancelled";
  assert.equal(code, "cancelled");
  assert.ok(NATIVE_BIOMETRIC_ERROR_CODES.includes(code));
});
