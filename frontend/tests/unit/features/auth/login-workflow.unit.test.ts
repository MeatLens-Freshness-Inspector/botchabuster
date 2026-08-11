import assert from "node:assert/strict";
import test from "node:test";
import {
  getAuthDestination,
  getLoginDescription,
} from "../../../../src/features/auth/model/login";

test("login workflow keeps authentication destinations and descriptions stable", () => {
  assert.equal(getAuthDestination(true), "/admin");
  assert.equal(getAuthDestination(false), "/inspect");
  assert.equal(getLoginDescription(false), "Access your MeatLens account");
  assert.equal(
    getLoginDescription(true),
    "Unlock your cached MeatLens session on this device",
  );
});
