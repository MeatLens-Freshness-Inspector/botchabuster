import assert from "node:assert/strict";
import test from "node:test";

import { ChangeAdminUserRole } from "../../../src/modules/users/application/ChangeAdminUserRole";

test("developer password gates role mutation and audit", async () => {
  const calls: string[] = [];
  let auditPayload: Record<string, unknown> | undefined;
  const useCase = new ChangeAdminUserRole(
    {
      changeUserRoleByAdmin: async (userId, role) => {
        calls.push(`${userId}:${role}`);
        return { previousRole: "user", role };
      },
    },
    {
      signIn: async (email, password) => {
        assert.equal(email, "developer@example.com");
        assert.equal(password, "developer-password");
        calls.push("verified");
        return { id: "developer-1", email };
      },
    },
    { write: async ({ payload }) => { auditPayload = payload; } },
  );

  const result = await useCase.execute({
    targetUserId: "user-2",
    role: "admin",
    password: "developer-password",
    actor: { id: "developer-1", email: "developer@example.com", role: "developer" },
    source: { ip: "127.0.0.1", userAgent: "test-agent" },
  });

  assert.deepEqual(result, { previousRole: "user", role: "admin" });
  assert.deepEqual(calls, ["verified", "user-2:admin"]);
  assert.equal((auditPayload?.data as Record<string, unknown>).previous_role, "user");
  assert.equal((auditPayload?.data as Record<string, unknown>).new_role, "admin");
  assert.equal(JSON.stringify(auditPayload).includes("developer-password"), false);
});

test("incorrect developer password prevents role mutation and audit", async () => {
  let mutationCalled = false;
  let auditCalled = false;
  const useCase = new ChangeAdminUserRole(
    {
      changeUserRoleByAdmin: async () => {
        mutationCalled = true;
        return { previousRole: "user", role: "admin" };
      },
    },
    { signIn: async () => { throw new Error("Sign in failed"); } },
    { write: async () => { auditCalled = true; } },
  );

  await assert.rejects(
    () => useCase.execute({
      targetUserId: "user-2",
      role: "admin",
      password: "wrong-password",
      actor: { id: "developer-1", email: "developer@example.com", role: "developer" },
      source: { ip: null, userAgent: null },
    }),
    /developer password is incorrect/i,
  );
  assert.equal(mutationCalled, false);
  assert.equal(auditCalled, false);
});

test("only user admin and developer are accepted", async () => {
  const useCase = new ChangeAdminUserRole(
    { changeUserRoleByAdmin: async () => ({ previousRole: null, role: "user" }) },
    { signIn: async () => ({ id: "developer-1", email: "developer@example.com" }) },
    { write: async () => undefined },
  );

  await assert.rejects(
    () => useCase.execute({
      targetUserId: "user-2",
      role: "moderator" as never,
      password: "developer-password",
      actor: { id: "developer-1", email: "developer@example.com", role: "developer" },
      source: { ip: null, userAgent: null },
    }),
    /role must be one of: user, admin, developer/i,
  );
});
