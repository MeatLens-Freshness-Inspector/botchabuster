import assert from "node:assert/strict";
import test from "node:test";
import {
  getNativeBiometricMessage,
  normalizeNativeBiometricError,
} from "../../../../src/features/native-biometric/model/native-biometric-errors";

test("normalizes user cancellation without treating it as a server failure", () => {
  const error = normalizeNativeBiometricError({ code: "userCancel", message: "cancelled" });
  assert.equal(error.code, "cancelled");
  assert.equal(error.retryable, true);
  assert.match(getNativeBiometricMessage(error, "login"), /cancelled/i);
});

test("normalizes lockout as a non-immediate retry", () => {
  const error = normalizeNativeBiometricError({ code: "biometryLockout", message: "locked" });
  assert.equal(error.code, "locked-out");
  assert.equal(error.retryable, false);
});

test("normalizes storage corruption as recoverable vault state", () => {
  const error = normalizeNativeBiometricError(new SyntaxError("bad json"));
  assert.equal(error.code, "vault-corrupt");
  assert.equal(error.retryable, true);
  assert.match(getNativeBiometricMessage(error, "unlock"), /fresh online/i);
});

test("does not expose native plugin storage details", () => {
  const error = normalizeNativeBiometricError({
    code: "unexpected",
    message: "keystore token=secret-value",
  });

  assert.equal(error.code, "storage-failed");
  assert.doesNotMatch(error.message, /secret-value/);
});
