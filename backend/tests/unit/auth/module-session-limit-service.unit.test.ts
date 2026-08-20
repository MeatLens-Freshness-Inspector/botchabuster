import assert from "node:assert/strict";
import { test } from "node:test";
import { SessionLimitService } from "../../../src/modules/auth/infrastructure/SessionLimitService";

test("module SessionLimitService enforces the configured active-session limit", async () => {
  const service = new SessionLimitService(1, false);
  await service.registerSession("user-1", "token-1", Math.floor(Date.now() / 1000) + 60);

  assert.equal(await service.isAtLimit("user-1", 900), true);
  assert.equal(await service.hasSession("token-1"), true);
});
