import assert from "node:assert/strict";
import test from "node:test";
import "../../setup/env";

import { startTestServer } from "../../support/appFactory";
import { authService } from "../../../src/modules/auth/infrastructure/SupabaseAuthFactory";
import { auditLogService } from "../../../src/modules/audit/infrastructure/AuditLogService";
import { profileService } from "../../../src/modules/users/infrastructure/ProfileService";

test("ordinary admins cannot call the role-change endpoint", async () => {
  const originalGetUser = authService.getUserByAccessToken.bind(authService);
  const originalGetRoles = profileService.getUserRoles.bind(profileService);
  let mutationCalled = false;
  const originalMutation = profileService.changeUserRoleByAdmin.bind(profileService);
  authService.getUserByAccessToken = async () => ({ id: "admin-1", email: "admin@example.com" });
  profileService.getUserRoles = async () => [{ id: "role-1", user_id: "admin-1", role: "admin" }];
  profileService.changeUserRoleByAdmin = async () => {
    mutationCalled = true;
    return { previousRole: "user", role: "developer" };
  };
  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/profiles/admin/users/user-2/role`, {
      method: "PUT",
      headers: { Authorization: "Bearer admin-token", "Content-Type": "application/json" },
      body: JSON.stringify({ role: "developer", password: "developer-password" }),
    });
    const body = await response.json() as { error?: string };
    assert.equal(response.status, 403);
    assert.match(body.error ?? "", /developer access required/i);
    assert.equal(mutationCalled, false);
  } finally {
    authService.getUserByAccessToken = originalGetUser;
    profileService.getUserRoles = originalGetRoles;
    profileService.changeUserRoleByAdmin = originalMutation;
    await close();
  }
});

test("developers receive the audited role-change result", async () => {
  const originalGetUser = authService.getUserByAccessToken.bind(authService);
  const originalGetRoles = profileService.getUserRoles.bind(profileService);
  const originalSignIn = authService.signIn.bind(authService);
  const originalMutation = profileService.changeUserRoleByAdmin.bind(profileService);
  const originalAuditWrite = auditLogService.write.bind(auditLogService);
  let receivedPassword = "";
  let auditCalled = false;
  authService.getUserByAccessToken = async () => ({ id: "developer-1", email: "developer@example.com" });
  profileService.getUserRoles = async () => [{ id: "role-1", user_id: "developer-1", role: "developer" }];
  authService.signIn = async (input) => {
    receivedPassword = input.password;
    return { user: { id: "developer-1", email: input.email }, session: null };
  };
  profileService.changeUserRoleByAdmin = async (userId, role) => {
    assert.equal(userId, "user-2");
    assert.equal(role, "admin");
    return { previousRole: "user", role: "admin" };
  };
  auditLogService.write = async () => { auditCalled = true; };
  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/profiles/admin/users/user-2/role`, {
      method: "PUT",
      headers: { Authorization: "Bearer developer-token", "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin", password: "developer-password" }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      user_id: "user-2",
      previous_role: "user",
      role: "admin",
    });
    assert.equal(receivedPassword, "developer-password");
    assert.equal(auditCalled, true);
  } finally {
    authService.getUserByAccessToken = originalGetUser;
    profileService.getUserRoles = originalGetRoles;
    authService.signIn = originalSignIn;
    profileService.changeUserRoleByAdmin = originalMutation;
    auditLogService.write = originalAuditWrite;
    await close();
  }
});
