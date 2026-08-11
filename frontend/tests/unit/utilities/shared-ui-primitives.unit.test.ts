import assert from "node:assert/strict";
import test from "node:test";

import { Button, Input, buttonVariants } from "../../../src/shared/ui";

test("shared UI public API exposes the core button and input primitives", () => {
  assert.equal(typeof Button, "object");
  assert.equal(typeof Input, "object");
  assert.equal(typeof buttonVariants, "function");
});
