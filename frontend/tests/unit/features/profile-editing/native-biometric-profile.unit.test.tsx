import assert from "node:assert/strict";
import test from "node:test";
import { getNativeBiometricProfileState } from "../../../../src/features/profile-editing/model/profile-settings";

test("profile exposes enable copy when native biometric login is available", () => {
  assert.deepEqual(getNativeBiometricProfileState({ available: true, enrolled: false }), {
    buttonLabel: "Enable Biometric Login",
    status: "Not enabled on this device",
  });
});

test("profile exposes enabled copy after native biometric enrollment", () => {
  assert.deepEqual(getNativeBiometricProfileState({ available: true, enrolled: true }), {
    buttonLabel: "Disable Biometric Login",
    status: "Biometric login enabled",
  });
});
