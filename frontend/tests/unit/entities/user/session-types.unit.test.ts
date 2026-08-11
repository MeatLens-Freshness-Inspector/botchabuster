import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AUTH_MODE_VALUES,
  PROFILE_STATUS_VALUES,
} from "../../../../src/entities/user/index";

test("user session entity publishes the complete profile and auth status vocabulary", () => {
  assert.deepEqual(PROFILE_STATUS_VALUES, ["idle", "loading", "ready", "error"]);
  assert.deepEqual(AUTH_MODE_VALUES, [
    "anonymous",
    "bootstrapping",
    "online-authenticated",
    "offline-locked",
    "offline-authenticated",
    "expired",
  ]);
});
