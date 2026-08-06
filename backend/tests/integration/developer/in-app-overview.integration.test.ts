import assert from "node:assert/strict";
import test from "node:test";
import "../../setup/env";
import { startTestServer } from "../../support/appFactory";

test("developer dashboard overview returns inAppMetrics payload", async () => {
  const { authService } = await import("../../../src/services/AuthService");
  const { profileService } = await import("../../../src/services/ProfileService");
  const { inspectionService } = await import("../../../src/services/InspectionService");
  const { developerDashboardStorageService } = await import("../../../src/services/DeveloperDashboardStorageService");

  const originalGetUserByAccessToken = authService.getUserByAccessToken.bind(authService);
  const originalGetUserRoles = profileService.getUserRoles.bind(profileService);
  const originalGetInAppModelMetrics = inspectionService.getInAppModelMetrics.bind(inspectionService);
  const originalListTrainingRunIds = developerDashboardStorageService.listTrainingRunIds.bind(developerDashboardStorageService);

  authService.getUserByAccessToken = async () => ({ id: "dev-1", email: "dev@example.com" });
  profileService.getUserRoles = async () => [{ id: "role-1", user_id: "dev-1", role: "developer" }];
  developerDashboardStorageService.listTrainingRunIds = async () => [];

  inspectionService.getInAppModelMetrics = async () => ({
    totalEvaluated: 10,
    correctlyIdentified: 9,
    incorrectlyIdentified: 1,
    inAppAccuracy: 0.9,
    inAppPrecision: 0.9,
    inAppRecall: 0.9,
    inAppF1Score: 0.9,
    classBreakdown: [
      {
        class: "fresh",
        modelIdentifiedCount: 5,
        actualCount: 5,
        tp: 5,
        fp: 0,
        fn: 0,
        tn: 5,
        accuracy: 1,
        precision: 1,
        recall: 1,
        f1Score: 1,
      },
    ],
    meatTypeBreakdown: [
      {
        meatType: "pork",
        totalCount: 10,
        correctCount: 9,
        accuracy: 0.9,
      },
    ],
  });

  const { baseUrl, close } = await startTestServer();

  try {
    const res = await fetch(`${baseUrl}/api/developer-dashboard/overview`, {
      headers: { Authorization: "Bearer dev-token" },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(body.inAppMetrics);
    assert.equal(body.inAppMetrics.inAppAccuracy, 0.9);
    assert.equal(body.inAppMetrics.totalEvaluated, 10);
  } finally {
    authService.getUserByAccessToken = originalGetUserByAccessToken;
    profileService.getUserRoles = originalGetUserRoles;
    inspectionService.getInAppModelMetrics = originalGetInAppModelMetrics;
    developerDashboardStorageService.listTrainingRunIds = originalListTrainingRunIds;
    await close();
  }
});
