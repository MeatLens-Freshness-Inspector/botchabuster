import assert from "node:assert/strict";
import { test } from "node:test";
import { AuthOperationsGateway } from "../../../src/modules/auth/infrastructure/AuthOperationsGateway";

test("AuthOperationsGateway adapts auth operations to the module port", async () => {
  const gateway = new AuthOperationsGateway({
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

test("AuthOperationsGateway rejects a missing user response", async () => {
  const gateway = new AuthOperationsGateway({
    signIn: async () => ({ user: null, session: null }),
  });

  await assert.rejects(() => gateway.signIn("user@example.com", "password"), /user record missing/i);
});
