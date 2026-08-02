import assert from "node:assert/strict";
import test from "node:test";
import "../../setup/env";
import { startTestServer } from "../../support/appFactory";

test("developer dashboard overview denies plain admins and allows developers", async () => {
  const { authService } = await import("../../../src/services/AuthService");
  const { profileService } = await import("../../../src/services/ProfileService");
  const { developerDashboardService } = await import("../../../src/services/DeveloperDashboardService");

  const originalGetUserByAccessToken = authService.getUserByAccessToken.bind(authService);
  const originalGetUserRoles = profileService.getUserRoles.bind(profileService);
  const originalGetOverview = developerDashboardService.getOverview.bind(developerDashboardService);

  authService.getUserByAccessToken = async (accessToken: string) => {
    if (accessToken === "developer-token") {
      return { id: "developer-1", email: "developer@example.com" };
    }

    return { id: "admin-1", email: "admin@example.com" };
  };
  profileService.getUserRoles = async (userId: string) => [
    {
      id: `role-${userId}`,
      user_id: userId,
      role: userId === "developer-1" ? "developer" : "admin",
    },
  ];
  developerDashboardService.getOverview = async () => ({
    highlightedFamilies: {
      mobilenetv2: null,
      mobilenetv3: null,
    },
    latestRuns: [],
  });

  const { baseUrl, close } = await startTestServer();

  try {
    const denied = await fetch(`${baseUrl}/api/developer-dashboard/overview`, {
      headers: { Authorization: "Bearer admin-token" },
    });
    assert.equal(denied.status, 403);

    const allowed = await fetch(`${baseUrl}/api/developer-dashboard/overview`, {
      headers: { Authorization: "Bearer developer-token" },
    });
    assert.equal(allowed.status, 200);
    assert.deepEqual(await allowed.json(), {
      highlightedFamilies: {
        mobilenetv2: null,
        mobilenetv3: null,
      },
      latestRuns: [],
    });
  } finally {
    authService.getUserByAccessToken = originalGetUserByAccessToken;
    profileService.getUserRoles = originalGetUserRoles;
    developerDashboardService.getOverview = originalGetOverview;
    await close();
  }
});
