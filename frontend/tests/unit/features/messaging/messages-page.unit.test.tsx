import assert from "node:assert/strict";
import test from "node:test";

import MessagesPage from "../../../../src/pages/inspector/messages-page";

test("messages route owns a page component", () => {
  assert.equal(typeof MessagesPage, "function");
});
