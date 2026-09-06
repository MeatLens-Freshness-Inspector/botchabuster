import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import "../../setup/env";
import { authService } from "../../../src/modules/auth/infrastructure/SupabaseAuthFactory";
import { profileService } from "../../../src/modules/users/infrastructure/ProfileService";
import { storageService } from "../../../src/modules/analysis/infrastructure/StorageService";
import { getEncryptedTestClient } from "../../support/requestFactory";
import { startTestServer } from "../../support/appFactory";

test("inspection upload receives decrypted image bytes and keeps raw multipart data off the wire", async () => {
  const originalGetUser = authService.getUserByAccessToken.bind(authService);
  const originalGetPrivilegeSummary = profileService.getPrivilegeSummary.bind(profileService);
  const originalUpload = storageService.uploadInspectionImage.bind(storageService);
  let observedBytes: Buffer | null = null;

  authService.getUserByAccessToken = async () => ({ id: "upload-user", email: "upload@example.com" });
  profileService.getPrivilegeSummary = async () => ({
    roles: [],
    primaryRole: "inspector",
    isAdmin: false,
    isDeveloper: false,
  });
  storageService.uploadInspectionImage = async (filePath, _userId, originalName) => {
    observedBytes = await readFile(filePath);
    assert.equal(originalName, "inspection.jpg");
    return "https://storage.example/inspection.jpg";
  };

  const { baseUrl, close } = await startTestServer();
  try {
    const client = await getEncryptedTestClient(baseUrl);
    const formData = new FormData();
    formData.append("image", new Blob([new Uint8Array([255, 216, 255])], { type: "image/jpeg" }), "inspection.jpg");
    const response = await client.request("/api/upload/inspection-image", {
      method: "POST",
      headers: { Authorization: "Bearer upload-token" },
      body: formData,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(observedBytes, Buffer.from([255, 216, 255]));
    assert.deepEqual(await response.json(), { imageUrl: "https://storage.example/inspection.jpg" });
  } finally {
    authService.getUserByAccessToken = originalGetUser;
    profileService.getPrivilegeSummary = originalGetPrivilegeSummary;
    storageService.uploadInspectionImage = originalUpload;
    await close();
  }
});
