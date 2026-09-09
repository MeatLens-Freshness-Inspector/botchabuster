import assert from "node:assert/strict";
import test from "node:test";
import { clearNativeBiometricOnAccountSwitch } from "../../../../src/features/native-biometric/model/native-account-cleanup";

test("clears the native vault when a different account signs in", async () => {
  let clearCalls = 0;

  const cleared = await clearNativeBiometricOnAccountSwitch("user-a", "user-b", async () => {
    clearCalls += 1;
  });

  assert.equal(cleared, true);
  assert.equal(clearCalls, 1);
});

test("keeps the native vault when the same account signs in", async () => {
  let clearCalls = 0;

  const cleared = await clearNativeBiometricOnAccountSwitch("user-a", "user-a", async () => {
    clearCalls += 1;
  });

  assert.equal(cleared, false);
  assert.equal(clearCalls, 0);
});
