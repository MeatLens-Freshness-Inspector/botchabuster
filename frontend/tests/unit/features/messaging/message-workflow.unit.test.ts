import assert from "node:assert/strict";
import test from "node:test";

import { useMessages } from "../../../../src/features/messaging";

test("messaging feature publishes its workflow hook", () => {
  assert.equal(typeof useMessages, "function");
});
