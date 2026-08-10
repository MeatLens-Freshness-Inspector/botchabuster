import assert from "node:assert/strict";
import { test } from "node:test";
import { AppSessionService } from "../../../src/modules/auth/infrastructure/AppSessionService";

test("module AppSessionService signs and verifies an app session", async () => {
  const service = new AppSessionService("module-secret", 300, () => 1_700_000_000_000);
  const session = service.createSession({ id: "user-1", email: "user@example.com" });

  assert.equal((await service.getUserFromAccessToken(session.access_token)).id, "user-1");
  assert.equal(service.getSession(session.access_token).sessionId.length > 0, true);
});
