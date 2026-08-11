import assert from "node:assert/strict";
import test from "node:test";
import ForgotPasswordPage from "../../../src/pages/auth/forgot-password-page";
import ResetPasswordPage from "../../../src/pages/auth/reset-password-page";

test("recovery route pages expose both public entry components", () => {
  assert.equal(typeof ForgotPasswordPage, "function");
  assert.equal(typeof ResetPasswordPage, "function");
});
