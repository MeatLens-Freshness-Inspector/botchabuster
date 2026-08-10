import assert from "node:assert/strict";
import { test } from "node:test";
import { ProfileServiceGateway } from "../../../src/modules/users/infrastructure/ProfileServiceGateway";

test("ProfileServiceGateway maps legacy profile rows to the users port", async () => {
  const gateway = new ProfileServiceGateway({
    getProfile: async () => ({
      id: "user-1",
      full_name: "Inspector One",
      avatar_url: null,
    }),
  });

  assert.deepEqual(await gateway.getProfile("user-1"), {
    id: "user-1",
    full_name: "Inspector One",
    email: null,
    avatar_url: null,
  });
});
