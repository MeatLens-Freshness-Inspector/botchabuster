import assert from "node:assert/strict";
import test from "node:test";

import {
  formatReportDateTime,
  formatReportPercentage,
} from "../../../../src/features/reports/lib/formatting";

test("report formatting preserves percentage precision", () => {
  assert.equal(formatReportPercentage(87), "87.00%");
  assert.equal(formatReportPercentage(null), "—");
});

test("report formatting preserves shared empty-date behavior", () => {
  assert.equal(formatReportDateTime(null), "-");
});
