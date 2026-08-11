import assert from "node:assert/strict";
import { test } from "node:test";
import { createSessionCacheState } from "../../../../src/entities/user/model/session-cache";

test("session cache model starts with an anonymous empty state", () => {
  assert.deepEqual(createSessionCacheState(), {
    user: null,
    session: null,
    profile: null,
    isAdmin: false,
    isDeveloper: false,
  });
});
