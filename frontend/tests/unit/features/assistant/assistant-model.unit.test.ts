import assert from "node:assert/strict";
import test from "node:test";

import {
  getChatRequestHeaders,
  useAssistant,
} from "../../../../src/features/assistant";

test("assistant feature publishes its workflow and request header contract", () => {
  assert.equal(typeof useAssistant, "function");
  assert.equal(getChatRequestHeaders()["Content-Type"], "application/json");
});
