import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBoundedInteger } from "../../../src/shared/application/requestLimits";

const options = { name: "limit", minimum: 1, maximum: 100, defaultValue: 50 };

test("parseBoundedInteger accepts numeric input and applies a default", () => {
  assert.equal(parseBoundedInteger("20", options), 20);
  assert.equal(parseBoundedInteger(undefined, options), 50);
});

test("parseBoundedInteger rejects malformed and out-of-range input", () => {
  assert.throws(() => parseBoundedInteger("nope", options), /limit must be an integer/i);
  assert.throws(() => parseBoundedInteger("0", options), /limit must be between 1 and 100/i);
  assert.throws(() => parseBoundedInteger("101", options), /limit must be between 1 and 100/i);
});
