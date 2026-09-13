import assert from "node:assert/strict";
import test from "node:test";
import "../../setup/env";
import { startTestServer } from "../../support/appFactory";
import { getEncryptedTestClient } from "../../support/requestFactory";

test("developer dashboard overview denies plain admins and allows developers", async () => {
  const { authService } = await import("../../../src/modules/auth/infrastructure/SupabaseAuthFactory");
  const { profileService } = await import("../../../src/modules/users/infrastructure/ProfileService");
  const { developerDashboardService } = await import("../../../src/modules/developer/infrastructure/DeveloperDashboardService");

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
  const client = await getEncryptedTestClient(baseUrl);

  try {
    const denied = await client.request("/api/developer-dashboard/overview", {
      headers: { Authorization: "Bearer admin-token" },
    });
    assert.equal(denied.status, 403);

    const allowed = await client.request("/api/developer-dashboard/overview", {
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

test("developer dashboard dispute history allows admins and denies non-admins", async () => {
  const { authService } = await import("../../../src/modules/auth/infrastructure/SupabaseAuthFactory");
  const { profileService } = await import("../../../src/modules/users/infrastructure/ProfileService");
  const { inspectionResultDisputeService } = await import("../../../src/modules/inspections/infrastructure/InspectionResultDisputeService");

  const originalGetUserByAccessToken = authService.getUserByAccessToken.bind(authService);
  const originalGetUserRoles = profileService.getUserRoles.bind(profileService);
  const originalListAllForReview = inspectionResultDisputeService.listAllForReview.bind(inspectionResultDisputeService);

  const dispute = {
    id: "dispute-1",
    inspection_id: "inspection-1",
    submitted_by: "inspector-1",
    expected_classification: "fresh" as const,
    reason: "The visible color is inconsistent with the model result.",
    status: "pending" as const,
    developer_label_applied_at: null,
    developer_label_applied_by: null,
    reviewed_at: null,
    reviewed_by: null,
    reviewer_note: null,
    created_at: "2026-09-13T00:00:00.000Z",
    updated_at: "2026-09-13T00:00:00.000Z",
  };

  authService.getUserByAccessToken = async (accessToken: string) => ({
    id: accessToken === "admin-token" ? "admin-1" : "inspector-1",
    email: `${accessToken}@example.com`,
  });
  profileService.getUserRoles = async (userId: string) => [
    {
      id: `role-${userId}`,
      user_id: userId,
      role: userId === "admin-1" ? "admin" : "inspector",
    },
  ];
  inspectionResultDisputeService.listAllForReview = async () => [dispute];

  const { baseUrl, close } = await startTestServer();
  const client = await getEncryptedTestClient(baseUrl);

  try {
    const denied = await client.request("/api/developer-dashboard/disputes/history", {
      headers: { Authorization: "Bearer inspector-token" },
    });
    assert.equal(denied.status, 403);

    const allowed = await client.request("/api/developer-dashboard/disputes/history", {
      headers: { Authorization: "Bearer admin-token" },
    });
    assert.equal(allowed.status, 200);
    assert.deepEqual(await allowed.json(), [dispute]);
  } finally {
    authService.getUserByAccessToken = originalGetUserByAccessToken;
    profileService.getUserRoles = originalGetUserRoles;
    inspectionResultDisputeService.listAllForReview = originalListAllForReview;
    await close();
  }
});
