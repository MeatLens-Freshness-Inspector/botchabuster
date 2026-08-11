import assert from "node:assert/strict";
import test from "node:test";
import LoginPage from "../../../src/pages/auth/login-page";
import SignupPage from "../../../src/pages/auth/signup-page";

test("authentication route pages expose both public entry components", () => {
  assert.equal(typeof LoginPage, "function");
  assert.equal(typeof SignupPage, "function");
});
