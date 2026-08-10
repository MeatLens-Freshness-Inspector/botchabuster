import assert from "node:assert/strict";
import { test } from "node:test";
import { SupabaseAuthOperations } from "../../../src/modules/auth/infrastructure/SupabaseAuthOperations";

test("SupabaseAuthOperations maps a credential exchange to a module auth user", async () => {
  const operations = new SupabaseAuthOperations({
    signInWithPassword: async () => ({
      data: { user: { id: "user-1", email: "user@example.com", user_metadata: {} }, session: null },
      error: null,
    }),
  } as never, {
    ensureProfile: async () => undefined,
    revokeSession: async () => undefined,
  }, {
    rpc: async () => ({ data: true, error: null }),
    from: () => undefined,
    auth: { admin: { updateUserById: async () => ({ data: { user: null }, error: null }) } },
  });

  const result = await operations.signIn({ email: " user@example.com ", password: "password" });

  assert.deepEqual(result, {
    user: { id: "user-1", email: "user@example.com" },
    session: null,
  });
});
