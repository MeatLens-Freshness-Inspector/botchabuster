import assert from "node:assert/strict";
import test from "node:test";
import { buildInspectorDailyReportModel } from "../../../../src/lib/reports/adapters/inspectorDailyReport";

// commit 01: report-graphs section must be present
// commit 02: classification breakdown points
// commit 03: meat type breakdown points
// commit 04: confidence-by-hour points
// commit 05: empty inspections → empty chart points

const sampleInspections = [
  {
    id: "inspection-1",
    created_at: "2026-08-01T08:00:00.000Z",
    captured_at: null,
    meat_type: "pork",
    classification: "fresh",
    confidence_score: 90,
    location: "East Market",
    image_url: null,
  },
  {
    id: "inspection-2",
    created_at: "2026-08-01T08:30:00.000Z",
    captured_at: null,
    meat_type: "pork",
    classification: "spoiled",
    confidence_score: 70,
    location: "West Market",
    image_url: null,
  },
  {
    id: "inspection-3",
    created_at: "2026-08-01T09:00:00.000Z",
    captured_at: null,
    meat_type: "chicken",
    classification: "fresh",
    confidence_score: 95,
    location: "East Market",
    image_url: null,
  },
] as const;

const baseInput = {
  reportOrganization: "dti" as const,
  selectedReportDay: "2026-08-01",
  generatedAt: "Aug 1, 2026 4:00 PM",
  averageConfidence: 85,
  inspections: sampleInspections,
};

// commit 01
test("buildInspectorDailyReportModel includes a report-graphs section", () => {
  const model = buildInspectorDailyReportModel(baseInput);
  assert.ok(
    model.sections.some((section) => section.id === "report-graphs"),
    "expected a section with id 'report-graphs' but none was found",
  );
});

// commit 02
test("buildInspectorDailyReportModel classification breakdown chart has correct points", () => {
  const model = buildInspectorDailyReportModel(baseInput);
  const graphSection = model.sections.find(
    (section) => section.id === "report-graphs",
  );
  const chart = graphSection?.charts?.find(
    (c) => c.id === "classification-breakdown",
  );

  assert.ok(chart, "classification-breakdown chart not found");
  assert.equal(chart.kind, "bar");
  // fresh: 2, spoiled: 1 — filtered from CLASSIFICATION_ORDER
  assert.deepEqual(
    chart.points.map((p) => p.label),
    ["fresh", "spoiled"],
  );
  assert.deepEqual(
    chart.points.map((p) => p.value),
    [2, 1],
  );
  // colours must be set for classification-breakdown
  assert.ok(
    chart.points.every((p) => typeof p.color === "string"),
    "all classification points must have a color",
  );
});

// commit 03
test("buildInspectorDailyReportModel meat type breakdown chart has correct points", () => {
  const model = buildInspectorDailyReportModel(baseInput);
  const graphSection = model.sections.find(
    (section) => section.id === "report-graphs",
  );
  const chart = graphSection?.charts?.find(
    (c) => c.id === "meat-type-breakdown",
  );

  assert.ok(chart, "meat-type-breakdown chart not found");
  assert.equal(chart.kind, "bar");
  // pork: 2, chicken: 1 — sorted desc by count
  assert.deepEqual(
    chart.points.map((p) => p.label),
    ["pork", "chicken"],
  );
  assert.deepEqual(
    chart.points.map((p) => p.value),
    [2, 1],
  );
});

// commit 04
test("buildInspectorDailyReportModel confidence-by-hour chart produces correct labels and averaged values", () => {
  const model = buildInspectorDailyReportModel(baseInput);
  const graphSection = model.sections.find(
    (section) => section.id === "report-graphs",
  );
  const chart = graphSection?.charts?.find(
    (c) => c.id === "confidence-by-hour",
  );

  assert.ok(chart, "confidence-by-hour chart not found");
  assert.equal(chart.kind, "line");
  // Hour 08 UTC: avg(90, 70) = 80 · Hour 09 UTC: avg(95) = 95
  assert.deepEqual(
    chart.points.map((p) => p.label),
    ["08:00", "09:00"],
  );
  assert.deepEqual(
    chart.points.map((p) => p.value),
    [80, 95],
  );
});

// commit 05
test("buildInspectorDailyReportModel chart sections have empty points when there are no inspections", () => {
  const model = buildInspectorDailyReportModel({
    ...baseInput,
    inspections: [],
  });
  const graphSection = model.sections.find(
    (section) => section.id === "report-graphs",
  );

  assert.ok(graphSection?.charts, "report-graphs section must still be present");
  assert.ok(
    graphSection.charts.length >= 3,
    "all three charts must be present even with no data",
  );
  assert.ok(
    graphSection.charts.every((chart) => chart.points.length === 0),
    "all charts must have empty points when there are no inspections",
  );
});
