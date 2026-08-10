import assert from "node:assert/strict";
import { test } from "node:test";
import { Result } from "../../../src/shared/application/Result";

test("Result.ok exposes a successful value", () => {
  const result = Result.ok(42);

  assert.equal(result.ok, true);
  assert.equal(result.value, 42);
});

test("Result.fail exposes a failure without throwing", () => {
  const result = Result.fail("invalid request");

  assert.equal(result.ok, false);
  assert.equal(result.error, "invalid request");
});
