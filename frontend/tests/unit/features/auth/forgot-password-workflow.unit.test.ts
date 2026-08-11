import assert from "node:assert/strict";
import test from "node:test";
import { getForgotPasswordErrorMessage } from "../../../../src/features/auth/model/forgot-password";

test("forgot-password workflow preserves useful API errors and its fallback", () => {
  assert.equal(
    getForgotPasswordErrorMessage(new Error("Account not found")),
    "Account not found",
  );
  assert.equal(
    getForgotPasswordErrorMessage({ unexpected: true }),
    "Failed to send reset link",
  );
});
