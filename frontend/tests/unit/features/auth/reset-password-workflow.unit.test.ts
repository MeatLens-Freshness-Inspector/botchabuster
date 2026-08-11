import assert from "node:assert/strict";
import test from "node:test";
import {
  getResetPasswordErrorMessage,
  resolveRecoverySession,
} from "../../../../src/features/auth/model/reset-password";

test("reset-password workflow resolves recovery links and safe fallback errors", () => {
  assert.deepEqual(resolveRecoverySession("#type=recovery&access_token=token-1"), {
    isRecovery: true,
    accessToken: "token-1",
    shouldClearHash: true,
  });
  assert.equal(
    getResetPasswordErrorMessage({ unexpected: true }),
    "Failed to update password",
  );
});
