import assert from "node:assert/strict";
import { test } from "node:test";
import { AuthToken } from "../../../src/modules/auth/domain/AuthToken";

test("AuthToken trims and exposes an immutable token value", () => {
  const token = AuthToken.create("  token-value  ");

  assert.equal(token.value, "token-value");
  assert.equal(token.toString(), "token-value");
});

test("AuthToken rejects empty values", () => {
  assert.throws(() => AuthToken.create("  "), /token is required/i);
});
