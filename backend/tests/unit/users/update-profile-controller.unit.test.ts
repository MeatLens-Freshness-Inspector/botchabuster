import assert from "node:assert/strict";
import test from "node:test";
import "../../setup/env";

import { ProfileController } from "../../../src/modules/users/presentation/controllers/ProfileController";
import { profileService } from "../../../src/modules/users/infrastructure/ProfileService";

function createResponse() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(payload: unknown) {
      response.body = payload;
      return response;
    },
  };

  return response;
}

test("self-service profile updates forward editable settings and ignore access code", async () => {
  const originalUpdateProfile = profileService.updateProfile;
  const calls: Array<{ userId: string; updates: Record<string, unknown> }> = [];
  profileService.updateProfile = async (userId, updates) => {
    calls.push({ userId, updates });
    return { id: userId } as never;
  };

  try {
    const response = createResponse();
    await new ProfileController().updateProfile({
      params: { id: "user-1" },
      body: {
        full_name: "Inspector Rivera",
        location: "Market A",
        report_organization: "dti",
        is_dark_mode: false,
        show_detailed_results: true,
        inspector_code: "FORGED-CODE",
      },
    } as never, response as never);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(calls, [{
      userId: "user-1",
      updates: {
        full_name: "Inspector Rivera",
        avatar_url: undefined,
        location: "Market A",
        report_organization: "dti",
        is_dark_mode: false,
        show_detailed_results: true,
        onboarding_completed_at: undefined,
      },
    }]);
  } finally {
    profileService.updateProfile = originalUpdateProfile;
  }
});

test("self-service profile updates reject an invalid report organization", async () => {
  const originalUpdateProfile = profileService.updateProfile;
  let updateCalled = false;
  profileService.updateProfile = async () => {
    updateCalled = true;
    return { id: "user-1" } as never;
  };

  try {
    const response = createResponse();
    await new ProfileController().updateProfile({
      params: { id: "user-1" },
      body: { report_organization: "unknown" },
    } as never, response as never);

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, {
      error: "report_organization must be one of: dti, city_veterinary_office_olongapo, gordon_college_ccs",
    });
    assert.equal(updateCalled, false);
  } finally {
    profileService.updateProfile = originalUpdateProfile;
  }
});
