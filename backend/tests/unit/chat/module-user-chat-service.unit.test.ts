import assert from "node:assert/strict";
import "../../setup/env";
import { test } from "node:test";
import { UserChatService } from "../../../src/modules/chat/infrastructure/UserChatService";

test("chat module owns user conversation persistence", () => {
  assert.equal(typeof UserChatService.getInstance, "function");
});
