import assert from "node:assert/strict";
import test from "node:test";
import { createBrowserNativeBiometricAdapter } from "../../../../src/features/native-biometric/api/browser-native-biometric";

test("browser adapter reports native biometrics as unavailable", async () => {
  const adapter = createBrowserNativeBiometricAdapter();

  assert.deepEqual(await adapter.checkAvailability(), {
    isNative: false,
    isAvailable: false,
    isEnrolled: false,
    label: "unavailable",
  });
  assert.equal(await adapter.hasRecord(), false);
});

test("browser adapter rejects native operations with a safe unavailable error", async () => {
  const adapter = createBrowserNativeBiometricAdapter();

  await assert.rejects(() => adapter.authenticate("login"), (error: unknown) => {
    return error instanceof Error && "code" in error && error.code === "unavailable";
  });
  await assert.rejects(() => adapter.readRecord(), /native biometric/i);
  await adapter.clearRecord();
});
