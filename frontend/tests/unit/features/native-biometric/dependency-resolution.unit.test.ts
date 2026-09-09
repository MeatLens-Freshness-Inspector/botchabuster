import assert from "node:assert/strict";
import test from "node:test";

test("native biometric feature dependencies resolve from the frontend workspace", async () => {
  const biometric = await import("@aparajita/capacitor-biometric-auth");
  const storage = await import("@aparajita/capacitor-secure-storage");

  assert.equal(typeof biometric.BiometricAuth.checkBiometry, "function");
  assert.equal(typeof biometric.BiometricAuth.authenticate, "function");
  assert.equal(typeof storage.SecureStorage.get, "function");
  assert.equal(typeof storage.SecureStorage.set, "function");
});
