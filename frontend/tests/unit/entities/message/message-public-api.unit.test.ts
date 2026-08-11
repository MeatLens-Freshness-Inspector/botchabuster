import assert from "node:assert/strict";
import test from "node:test";

import {
  UserChatClient,
  userChatClient,
} from "../../../../src/entities/message";

test("message entity publishes its client and singleton", () => {
  assert.equal(typeof UserChatClient, "function");
  assert.equal(userChatClient, UserChatClient.getInstance());
});
