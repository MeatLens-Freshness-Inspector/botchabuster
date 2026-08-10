import assert from "node:assert/strict";
import { test } from "node:test";
import { AuthServiceGateway } from "../../../src/modules/auth/infrastructure/AuthServiceGateway";

test("AuthServiceGateway adapts the legacy auth service to the module port", async () => {
  const gateway = new AuthServiceGateway({
    signIn: async (input) => ({
      user: { id: "user-1", email: input.email },
      session: null,
    }),
  });

  assert.deepEqual(await gateway.signIn("user@example.com", "password"), {
    id: "user-1",
    email: "user@example.com",
  });
});

test("AuthServiceGateway rejects a missing user response", async () => {
  const gateway = new AuthServiceGateway({
    signIn: async () => ({ user: null, session: null }),
  });

  await assert.rejects(() => gateway.signIn("user@example.com", "password"), /user record missing/i);
});
