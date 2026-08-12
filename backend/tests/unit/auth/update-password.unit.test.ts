import assert from "node:assert/strict";
import test from "node:test";

import { UpdatePassword } from "../../../src/modules/auth/application/UpdatePassword";
import { SupabaseAuthOperations } from "../../../src/modules/auth/infrastructure/SupabaseAuthOperations";

test("UpdatePassword forwards current and new passwords to its gateway", async () => {
  const calls: Array<{ userId: string; currentPassword: string; newPassword: string }> = [];
  const useCase = new UpdatePassword({
    updatePassword: async (userId, currentPassword, newPassword) => {
      calls.push({ userId, currentPassword, newPassword });
    },
  });

  await useCase.execute("user-1", "old-password", "new-password");

  assert.deepEqual(calls, [{
    userId: "user-1",
    currentPassword: "old-password",
    newPassword: "new-password",
  }]);
});

test("SupabaseAuthOperations verifies the current password before updating", async () => {
  const signInCalls: Array<{ email: string; password: string }> = [];
  const updateCalls: Array<{ userId: string; updates: Record<string, unknown> }> = [];
  const revokedTokens: Array<string | null | undefined> = [];
  const operations = new SupabaseAuthOperations({
    signInWithPassword: async (input) => {
      signInCalls.push(input);
      return {
        data: {
          user: { id: "user-1", email: "inspector@example.com" },
          session: { access_token: "verification-token" },
        },
        error: null,
      };
    },
  }, {
    revokeSession: async (accessToken) => {
      revokedTokens.push(accessToken);
    },
  }, {
    rpc: async () => ({ data: true, error: null }),
    from: () => undefined,
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { id: "user-1", email: "inspector@example.com" } },
          error: null,
        }),
        updateUserById: async (userId, updates) => {
          updateCalls.push({ userId, updates });
          return { data: { user: { id: userId } }, error: null };
        },
      },
    },
  });

  await operations.updatePassword("user-1", "old-password", "new-password");

  assert.deepEqual(signInCalls, [{
    email: "inspector@example.com",
    password: "old-password",
  }]);
  assert.deepEqual(revokedTokens, ["verification-token"]);
  assert.deepEqual(updateCalls, [{
    userId: "user-1",
    updates: { password: "new-password" },
  }]);
});

test("SupabaseAuthOperations rejects an incorrect current password before updating", async () => {
  let updateCalled = false;
  const operations = new SupabaseAuthOperations({
    signInWithPassword: async () => ({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    }),
  }, {}, {
    rpc: async () => ({ data: true, error: null }),
    from: () => undefined,
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { id: "user-1", email: "inspector@example.com" } },
          error: null,
        }),
        updateUserById: async () => {
          updateCalled = true;
          return { data: { user: null }, error: null };
        },
      },
    },
  });

  await assert.rejects(
    () => operations.updatePassword("user-1", "wrong-password", "new-password"),
    /current password is incorrect/i,
  );
  assert.equal(updateCalled, false);
});
