import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertValidAccuracy,
  assertValidDate,
  assertValidIsoDateTime,
} from "../../../src/modules/model-accuracy/domain/modelAccuracy";

test("accuracy validation accepts the unit interval and rejects non-finite values", () => {
  assert.equal(assertValidAccuracy(0), 0);
  assert.equal(assertValidAccuracy(1), 1);
  assert.throws(() => assertValidAccuracy(-0.01), /accuracy must be between 0 and 1/i);
  assert.throws(() => assertValidAccuracy(1.01), /accuracy must be between 0 and 1/i);
  assert.throws(() => assertValidAccuracy(Number.NaN), /accuracy must be between 0 and 1/i);
  assert.throws(() => assertValidAccuracy(Number.POSITIVE_INFINITY), /accuracy must be between 0 and 1/i);
});

test("date validation accepts canonical UTC dates and ISO datetimes only", () => {
  assert.equal(assertValidDate("2026-08-26"), "2026-08-26");
  assert.equal(assertValidIsoDateTime("2026-08-26T00:00:00.000Z"), "2026-08-26T00:00:00.000Z");
  assert.throws(() => assertValidDate("2026-8-26"), /date must be YYYY-MM-DD/i);
  assert.throws(() => assertValidDate("2026-02-30"), /date must be a valid calendar date/i);
  assert.throws(() => assertValidIsoDateTime("not-a-date"), /activeFrom must be a valid ISO datetime/i);
  assert.throws(() => assertValidIsoDateTime("2026-02-30T00:00:00.000Z"), /must be a valid calendar date/i);
  assert.throws(() => assertValidIsoDateTime(42), /activeFrom must be a valid ISO datetime/i);
});
