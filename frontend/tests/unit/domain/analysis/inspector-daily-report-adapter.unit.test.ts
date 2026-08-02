import assert from "node:assert/strict";
import test from "node:test";
import { buildInspectorDailyReportModel } from "../../../../src/lib/reports/adapters/inspectorDailyReport";

const sampleInspection = {
  id: "inspection-1",
  created_at: "2026-08-01T08:00:00.000Z",
  meat_type: "pork",
  classification: "fresh",
  confidence_score: 88,
  location: "East Market",
} as const;

test("buildInspectorDailyReportModel puts the shared meat section into every organization model", () => {
  const model = buildInspectorDailyReportModel({
    reportOrganization: "dti",
    selectedReportDay: "2026-08-01",
    generatedAt: "Aug 1, 2026 4:00 PM",
    averageConfidence: 88,
    inspections: [sampleInspection],
  });

  assert.equal(model.templateKey, "dti");
  assert.equal(model.kind, "inspector_daily");
  assert.ok(model.sections.some((section) => section.id === "meat-summary"));
  assert.ok(model.sections.some((section) => section.id === "meat-detail"));
});
