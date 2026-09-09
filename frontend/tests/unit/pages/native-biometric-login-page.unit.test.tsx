import assert from "node:assert/strict";
import test from "node:test";
import { getNativeBiometricLoginState } from "../../../src/features/auth/model/login";

test("login page hides native biometric action when the vault is unavailable", () => {
  assert.deepEqual(getNativeBiometricLoginState({ available: false, offline: false }), {
    visible: false,
    label: "Sign In with Device Biometrics",
  });
});

test("login page labels native biometric action as unlock while offline", () => {
  assert.deepEqual(getNativeBiometricLoginState({ available: true, offline: true }), {
    visible: true,
    label: "Unlock with Device Biometrics",
  });
});
