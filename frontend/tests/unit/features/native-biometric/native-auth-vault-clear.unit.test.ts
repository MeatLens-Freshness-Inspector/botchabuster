import assert from "node:assert/strict";
import test from "node:test";
import { createNativeAuthVault } from "../../../../src/features/native-biometric/api/native-auth-vault";

test("native vault clear is idempotent", async () => {
  let clearCalls = 0;
  const vault = createNativeAuthVault({
    authenticate: async () => undefined,
    readRecord: async () => "",
    writeRecord: async () => undefined,
    clearRecord: async () => {
      clearCalls += 1;
    },
  });

  await vault.clear();
  await vault.clear();
  assert.equal(clearCalls, 2);
});

test("native vault can clear corrupt records through the same invalidation path", async () => {
  let cleared = false;
  const vault = createNativeAuthVault({
    authenticate: async () => undefined,
    readRecord: async () => "bad",
    writeRecord: async () => undefined,
    clearRecord: async () => {
      cleared = true;
    },
  });

  await assert.rejects(() => vault.unlock("login"), /invalid|corrupt/i);
  await vault.clearAfterCorruption();
  assert.equal(cleared, true);
});
