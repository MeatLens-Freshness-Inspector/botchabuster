import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";

function createRequest(authorization = "Bearer developer-token"): Request {
  return {
    method: "GET",
    header(name: string) {
      return name.toLowerCase() === "authorization" ? authorization : undefined;
    },
  } as Request;
}

test("resolveRequestAuthContext treats developers as admin and exposes developer fields", async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
  process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

  const { resolveRequestAuthContext } = await import("../../src/middleware/auth");
  const { authService } = await import("../../src/services/AuthService");
  const { profileService } = await import("../../src/services/ProfileService");

  const originalGetUserByAccessToken = authService.getUserByAccessToken.bind(authService);
  const originalGetUserRoles = profileService.getUserRoles.bind(profileService);

  authService.getUserByAccessToken = async () => ({
    id: "developer-1",
    email: "developer@example.com",
  });
  profileService.getUserRoles = async () => [
    { id: "role-1", user_id: "developer-1", role: "developer" as const },
  ];

  try {
    const authContext = await resolveRequestAuthContext(createRequest());

    assert.deepEqual(authContext, {
      userId: "developer-1",
      email: "developer@example.com",
      roles: ["developer"],
      primaryRole: "developer",
      isAdmin: true,
      isDeveloper: true,
    });
  } finally {
    authService.getUserByAccessToken = originalGetUserByAccessToken;
    profileService.getUserRoles = originalGetUserRoles;
  }
});

test("toAuditActor records developer as the actor role", async () => {
  const { toAuditActor } = await import("../../src/middleware/auth");

  assert.deepEqual(
    toAuditActor({
      userId: "developer-1",
      primaryRole: "developer",
    }),
    {
      id: "developer-1",
      role: "developer",
    },
  );
});
