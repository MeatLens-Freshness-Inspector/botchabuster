import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";

function createRequest(authorization?: string): Request {
  return {
    header(name: string) {
      if (name.toLowerCase() === "authorization") {
        return authorization;
      }
      return undefined;
    },
  } as Request;
}

test("resolveRequestAuthContext rejects requests without a bearer token", async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
  process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

  const { RequestAuthError, resolveRequestAuthContext } = await import("../src/middleware/auth");

  await assert.rejects(
    async () => resolveRequestAuthContext(createRequest()),
    (error: unknown) =>
      error instanceof RequestAuthError &&
      error.status === 401 &&
      /authentication required/i.test(error.message),
  );
});

test("resolveRequestAuthContext loads the signed-in user and admin flag", async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
  process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

  const { resolveRequestAuthContext } = await import("../src/middleware/auth");
  const { authService } = await import("../src/services/AuthService");
  const { profileService } = await import("../src/services/ProfileService");

  const originalGetUserByAccessToken = authService.getUserByAccessToken.bind(authService);
  const originalHasRole = profileService.hasRole.bind(profileService);

  authService.getUserByAccessToken = async (accessToken: string) => {
    assert.equal(accessToken, "session-token");
    return {
      id: "user-1",
      email: "inspector@example.com",
    };
  };
  profileService.hasRole = async (userId: string, role: string) => {
    assert.equal(userId, "user-1");
    assert.equal(role, "admin");
    return true;
  };

  try {
    const authContext = await resolveRequestAuthContext(createRequest("Bearer session-token"));
    assert.deepEqual(authContext, {
      userId: "user-1",
      email: "inspector@example.com",
      isAdmin: true,
    });
  } finally {
    authService.getUserByAccessToken = originalGetUserByAccessToken;
    profileService.hasRole = originalHasRole;
  }
});

test("assertSelf rejects attempts to mutate another user's account", async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
  process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

  const { RequestAuthError, assertSelf } = await import("../src/middleware/auth");

  assert.throws(
    () => assertSelf({ userId: "user-1", email: "inspector@example.com", isAdmin: false }, "user-2"),
    (error: unknown) =>
      error instanceof RequestAuthError &&
      error.status === 403 &&
      /forbidden/i.test(error.message),
  );
});

test("assertSelfOrAdmin allows administrators to access another user's record", async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
  process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

  const { assertSelfOrAdmin } = await import("../src/middleware/auth");

  assert.doesNotThrow(() =>
    assertSelfOrAdmin({ userId: "admin-1", email: "admin@example.com", isAdmin: true }, "user-2"),
  );
});
