import assert from "node:assert/strict";
import { test } from "node:test";
import { Cursor, PageLimit, PageOffset } from "../../../src/shared/application/pagination";

test("PageLimit accepts values within the configured bounds", () => {
  const limit = PageLimit.create(25, 100);

  assert.equal(limit.value, 25);
});

test("PageLimit rejects zero, negative, fractional, and oversized values", () => {
  assert.throws(() => PageLimit.create(0, 100), /between 1 and 100/i);
  assert.throws(() => PageLimit.create(-1, 100), /between 1 and 100/i);
  assert.throws(() => PageLimit.create(1.5, 100), /integer/i);
  assert.throws(() => PageLimit.create(101, 100), /between 1 and 100/i);
});

test("PageOffset accepts non-negative integers", () => {
  assert.equal(PageOffset.create(0).value, 0);
  assert.equal(PageOffset.create(10).value, 10);
  assert.throws(() => PageOffset.create(-1), /non-negative integer/i);
  assert.throws(() => PageOffset.create(1.2), /non-negative integer/i);
});

test("Cursor trims and rejects empty values", () => {
  assert.equal(Cursor.create("  abc  ").value, "abc");
  assert.throws(() => Cursor.create("  "), /cursor is required/i);
});
