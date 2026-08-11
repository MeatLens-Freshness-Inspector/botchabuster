import assert from "node:assert/strict";
import test from "node:test";

import * as reports from "../../../../src/features/reports";

test("reports publishes the report generation workflow", () => {
  assert.equal(typeof reports.generateReport, "function");
  assert.equal(typeof reports.composeReportPdf, "function");
});
