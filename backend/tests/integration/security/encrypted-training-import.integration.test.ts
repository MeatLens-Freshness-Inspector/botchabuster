import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import "../../setup/env";
import { authService } from "../../../src/modules/auth/infrastructure/SupabaseAuthFactory";
import { profileService } from "../../../src/modules/users/infrastructure/ProfileService";
import { developerDashboardService } from "../../../src/modules/developer/infrastructure/DeveloperDashboardService";
import { getEncryptedTestClient } from "../../support/requestFactory";
import { startTestServer } from "../../support/appFactory";

test("training package import receives encrypted ZIP bytes and cleans up its temp file", async () => {
  const originalGetUser = authService.getUserByAccessToken.bind(authService);
  const originalGetPrivilegeSummary = profileService.getPrivilegeSummary.bind(profileService);
  const originalImport = developerDashboardService.importTrainingRunPackage.bind(developerDashboardService);
  let observedBytes: Buffer | null = null;

  authService.getUserByAccessToken = async () => ({ id: "developer-1", email: "developer@example.com" });
  profileService.getPrivilegeSummary = async () => ({
    roles: [],
    primaryRole: "developer",
    isAdmin: false,
    isDeveloper: true,
  });
  developerDashboardService.importTrainingRunPackage = async (filePath) => {
    observedBytes = await readFile(filePath);
    return {
      runId: "run-1",
      createdAt: "2026-09-06T00:00:00.000Z",
      modelFamily: "mobilenet",
      modelVariant: "v3",
      modelVersion: "1",
      datasetName: "sample",
      datasetRecordCount: 1,
      metrics: { accuracy: 1, precision: 1, recall: 1, f1Score: 1 },
      manifestPath: "manifests/run-1.json",
      artifactPaths: [],
    };
  };

  const { baseUrl, close } = await startTestServer();
  try {
    const client = await getEncryptedTestClient(baseUrl);
    const formData = new FormData();
    formData.append("package", new Blob([new Uint8Array([80, 75, 3, 4])], { type: "application/zip" }), "run.zip");
    const response = await client.request("/api/developer-dashboard/training-runs/import", {
      method: "POST",
      headers: { Authorization: "Bearer developer-token" },
      body: formData,
    });

    assert.equal(response.status, 201);
    assert.deepEqual(observedBytes, Buffer.from([80, 75, 3, 4]));
    assert.equal((await response.json() as { runId?: string }).runId, "run-1");
  } finally {
    authService.getUserByAccessToken = originalGetUser;
    profileService.getPrivilegeSummary = originalGetPrivilegeSummary;
    developerDashboardService.importTrainingRunPackage = originalImport;
    await close();
  }
});
