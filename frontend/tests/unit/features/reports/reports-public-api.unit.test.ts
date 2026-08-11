import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInspectorDailyReportModel,
  buildReportDocDefinition,
  composeReportPdf,
  loadPdfMake,
} from "../../../../src/features/reports";

test("reports publishes moved report builders through its feature API", () => {
  assert.equal(typeof buildInspectorDailyReportModel, "function");
  assert.equal(typeof buildReportDocDefinition, "function");
  assert.equal(typeof composeReportPdf, "function");
  assert.equal(typeof loadPdfMake, "function");
});
