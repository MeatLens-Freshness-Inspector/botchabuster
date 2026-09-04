import assert from "node:assert/strict";
import test from "node:test";
import { formatUtcDateOnly, futureDateOnly } from "../../support/factories/dates";

test("formatUtcDateOnly formats the UTC calendar date", () => {
  assert.equal(formatUtcDateOnly(new Date("2026-09-04T23:59:59.000Z")), "2026-09-04");
});

test("futureDateOnly crosses month and year boundaries from UTC", () => {
  assert.equal(futureDateOnly(30, new Date("2026-12-15T23:59:59.000Z")), "2027-01-14");
});

test("futureDateOnly handles leap-year arithmetic", () => {
  assert.equal(futureDateOnly(1, new Date("2028-02-28T12:00:00.000Z")), "2028-02-29");
});

test("futureDateOnly defaults to a date after the current UTC date", () => {
  const today = new Date();
  const future = futureDateOnly();

  assert.ok(future > formatUtcDateOnly(today));
});
