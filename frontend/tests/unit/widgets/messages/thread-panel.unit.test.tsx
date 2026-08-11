import assert from "node:assert/strict";
import test from "node:test";

import { ThreadPanel } from "../../../../src/widgets/messages";

test("messages widget publishes the thread panel", () => {
  assert.equal(typeof ThreadPanel, "function");
});
