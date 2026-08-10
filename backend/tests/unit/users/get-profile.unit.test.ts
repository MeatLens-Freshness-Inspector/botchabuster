import assert from "node:assert/strict";
import { test } from "node:test";
import { GetProfile } from "../../../src/modules/users/application/GetProfile";

const profile = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  full_name: "Inspector One",
  email: "inspector@example.com",
};

test("GetProfile validates the user id and returns the profile", async () => {
  const useCase = new GetProfile({
    getProfile: async (userId) => ({ ...profile, id: userId }),
  });

  assert.deepEqual(await useCase.execute(profile.id), profile);
});

test("GetProfile returns a not-found application error for missing profiles", async () => {
  const useCase = new GetProfile({ getProfile: async () => null });

  await assert.rejects(() => useCase.execute(profile.id), /profile not found/i);
});
