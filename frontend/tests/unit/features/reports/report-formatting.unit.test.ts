import assert from "node:assert/strict";
import test from "node:test";

import {
  formatInspectorNameForExport,
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

test("formatInspectorNameForExport abbreviates the first name and preserves the remaining name", () => {
  assert.equal(formatInspectorNameForExport("Adriaan Dimate"), "A. Dimate");
  assert.equal(formatInspectorNameForExport("  Maria Clara Santos  "), "M. Clara Santos");
});

test("formatInspectorNameForExport preserves non-name fallback labels", () => {
  assert.equal(formatInspectorNameForExport("inspector@example.com"), "inspector@example.com");
  assert.equal(formatInspectorNameForExport("INSP-01"), "INSP-01");
  assert.equal(formatInspectorNameForExport("Unknown Inspector"), "Unknown Inspector");
  assert.equal(formatInspectorNameForExport("SingleName"), "SingleName");
  assert.equal(formatInspectorNameForExport("   "), "");
});
