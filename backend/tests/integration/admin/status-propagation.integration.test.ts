import assert from "node:assert/strict";
import test from "node:test";
import "../../setup/env";
import { createCookieFixture } from "../../support/authFactory";
import { startTestServer } from "../../support/appFactory";

test("protected admin data endpoints preserve session-limit 429 responses instead of downgrading them to 401", async () => {
  const { authService } = await import("../../../src/services/AuthService");
  const { profileService } = await import("../../../src/services/ProfileService");
  const { getSessionLimitService } = await import("../../../src/services/SessionLimitService");

  const originalGetUserByAccessToken = authService.getUserByAccessToken.bind(authService);
  const originalGetUserRoles = profileService.getUserRoles.bind(profileService);
  const sessionLimit = getSessionLimitService();
  const originalHasSession = sessionLimit.hasSession.bind(sessionLimit);
  const originalPruneExpiredSessions = sessionLimit.pruneExpiredSessions.bind(sessionLimit);
  const originalIsAtLimit = sessionLimit.isAtLimit.bind(sessionLimit);
  const originalRegisterSession = sessionLimit.registerSession.bind(sessionLimit);

  authService.getUserByAccessToken = async () => ({
    id: "admin-1",
    email: "admin@example.com",
  });
  profileService.getUserRoles = async () => [{ id: "role-1", user_id: "admin-1", role: "admin" }];
  sessionLimit.hasSession = async () => false;
  sessionLimit.pruneExpiredSessions = async () => undefined;
  sessionLimit.isAtLimit = async () => true;
  sessionLimit.registerSession = async () => {
    assert.fail("device-slot registration should not happen after a limit rejection");
  };

  const { session } = await createCookieFixture({ id: "admin-1", email: "admin@example.com" });
  const { baseUrl, close } = await startTestServer();

  try {
    for (const path of [
      "/api/access-codes",
      "/api/inspections?limit=200&offset=0&scope=all",
    ]) {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: {
          Cookie: `meatlens_session=${session.access_token}`,
          Origin: "http://localhost:8080",
        },
      });
      const body = await response.json() as { error?: string };

      assert.equal(response.status, 429);
      assert.match(body.error ?? "", /maximum number of devices/i);
    }
  } finally {
    authService.getUserByAccessToken = originalGetUserByAccessToken;
    profileService.getUserRoles = originalGetUserRoles;
    sessionLimit.hasSession = originalHasSession;
    sessionLimit.pruneExpiredSessions = originalPruneExpiredSessions;
    sessionLimit.isAtLimit = originalIsAtLimit;
    sessionLimit.registerSession = originalRegisterSession;
    await close();
  }
});
