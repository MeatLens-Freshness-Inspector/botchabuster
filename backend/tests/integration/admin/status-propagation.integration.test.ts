import assert from "node:assert/strict";
import test from "node:test";
import "../../setup/env";
import { createCookieFixture } from "../../support/authFactory";
import { startTestServer } from "../../support/appFactory";
import { getEncryptedTestClient } from "../../support/requestFactory";

test("protected admin data endpoints reject untracked sessions instead of re-registering them", async () => {
  const { authService } = await import("../../../src/modules/auth/infrastructure/SupabaseAuthFactory");
  const { profileService } = await import("../../../src/modules/users/infrastructure/ProfileService");
  const { getSessionLimitService } = await import("../../../src/modules/auth/infrastructure/SessionLimitService");

  const originalGetUserByAccessToken = authService.getUserByAccessToken.bind(authService);
  const originalGetUserRoles = profileService.getUserRoles.bind(profileService);
  const sessionLimit = getSessionLimitService();
  const originalTouchSession = sessionLimit.touchSession.bind(sessionLimit);
  const originalRegisterSession = sessionLimit.registerSession.bind(sessionLimit);

  authService.getUserByAccessToken = async () => ({
    id: "admin-1",
    email: "admin@example.com",
  });
  profileService.getUserRoles = async () => [{ id: "role-1", user_id: "admin-1", role: "admin" }];
  sessionLimit.touchSession = async () => false;
  sessionLimit.registerSession = async () => {
    assert.fail("device-slot registration should not happen after a limit rejection");
  };

  const { session } = await createCookieFixture({ id: "admin-1", email: "admin@example.com" });
  const { baseUrl, close } = await startTestServer();
  const client = await getEncryptedTestClient(baseUrl);

  try {
    for (const path of [
      "/api/access-codes",
      "/api/inspections?limit=200&offset=0&scope=all",
    ]) {
      const response = await client.request(path, {
        headers: {
          Cookie: `meatlens_session=${session.access_token}`,
          Origin: "http://localhost:8080",
        },
      });
      const body = await response.json() as { error?: string };

      assert.equal(response.status, 401);
      assert.match(body.error ?? "", /invalid or expired access token/i);
    }
  } finally {
    authService.getUserByAccessToken = originalGetUserByAccessToken;
    profileService.getUserRoles = originalGetUserRoles;
    sessionLimit.touchSession = originalTouchSession;
    sessionLimit.registerSession = originalRegisterSession;
    await close();
  }
});
