import assert from "node:assert/strict";
import test from "node:test";
import { getNativeBiometricLoginLabel } from "../../../../src/features/auth/model/login";

test("native biometric login label distinguishes online login from offline unlock", () => {
  assert.equal(getNativeBiometricLoginLabel(false), "Sign In with Device Biometrics");
  assert.equal(getNativeBiometricLoginLabel(true), "Unlock with Device Biometrics");
});
