import assert from "node:assert/strict";
import { test } from "node:test";
import { AuthView } from "../../../src/modules/auth/presentation/views/AuthView";

test("AuthView serializes a user without exposing session internals", () => {
  assert.deepEqual(AuthView.user({ id: "user-1", email: "user@example.com" }), {
    id: "user-1",
    email: "user@example.com",
  });
});
