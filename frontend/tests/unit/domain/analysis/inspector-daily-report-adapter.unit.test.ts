import assert from "node:assert/strict";
import test from "node:test";
import { formatDateTime as formatReportDateTime } from "../../../../src/shared/lib/date-time";
import { buildInspectorDailyReportModel } from "../../../../src/lib/reports/adapters/inspectorDailyReport";

const sampleInspection = {
  id: "inspection-1",
  created_at: "2026-08-01T08:00:00.000Z",
  captured_at: "2026-08-01T08:05:30.000Z",
  meat_type: "pork",
  classification: "fresh",
  confidence_score: 88,
  location: "East Market",
  image_url: "https://example.com/unsegmented-pork.jpg",
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

// commit 06
test("buildInspectorDailyReportModel includes a report-graphs section with three charts", () => {
  const model = buildInspectorDailyReportModel({
    reportOrganization: "dti",
    selectedReportDay: "2026-08-01",
    generatedAt: "Aug 1, 2026 4:00 PM",
    averageConfidence: 88,
    inspections: [sampleInspection],
  });

  const graphSection = model.sections.find(
    (section) => section.id === "report-graphs",
  );
  assert.ok(graphSection, "report-graphs section must exist");
  assert.ok(graphSection.charts, "report-graphs section must have charts");
  assert.equal(
    graphSection.charts.length,
    3,
    "report-graphs section must have exactly 3 charts",
  );
  assert.deepEqual(
    graphSection.charts.map((c) => c.id),
    ["classification-breakdown", "meat-type-breakdown", "confidence-by-hour"],
  );
});

test("buildInspectorDailyReportModel preserves formatted captured timestamps and unsegmented image urls", () => {
  const model = buildInspectorDailyReportModel({
    reportOrganization: "dti",
    selectedReportDay: "2026-08-01",
    generatedAt: "Aug 1, 2026 4:00 PM",
    averageConfidence: 88,
    inspections: [sampleInspection],
  });

  const detailSection = model.sections.find((section) => section.id === "meat-detail");

  assert.ok(detailSection?.inspectionEvidence);
  assert.equal(
    detailSection?.inspectionEvidence?.[0].capturedAt,
    formatReportDateTime("2026-08-01T08:05:30.000Z"),
  );
  assert.equal(
    detailSection?.inspectionEvidence?.[0].imageUrl,
    "https://example.com/unsegmented-pork.jpg",
  );
});
