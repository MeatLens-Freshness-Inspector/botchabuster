import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminRangeReportModel } from "../../../../src/lib/reports/adapters/adminRangeReport";

const sampleAdminInput = {
  reportOrganization: "gordon_college_ccs" as const,
  reportStartDate: "2026-08-01",
  reportEndDate: "2026-08-02",
  generatedAt: "Aug 2, 2026 10:15 AM",
  generatedBy: "admin@example.com",
  summary: {
    total: 3,
    averageConfidence: 91,
    spoiledRate: 33,
    uniqueInspectors: 2,
    uniqueLocations: 2,
    flaggedRecords: 1,
  },
  reportRows: [
    {
      createdAt: "2026-08-01T08:00:00.000Z",
      capturedAt: null,
      inspector: "Inspector One",
      location: "East Market",
      meatType: "pork",
      classification: "fresh",
      confidenceScore: 93,
      imageUrl: null,
    },
  ],
} as const;

test("buildAdminRangeReportModel includes existing aggregate metrics without placeholders", () => {
  const model = buildAdminRangeReportModel(sampleAdminInput);

  assert.equal(model.kind, "admin_range");
  assert.equal(model.templateKey, "gcccs");
  assert.ok(model.sections.some((section) => section.id === "org-overview"));
  assert.ok(model.sections.some((section) => section.id === "meat-summary"));
  assert.ok(model.sections.some((section) => section.id === "meat-detail"));
});

test("buildAdminRangeReportModel adds graph payloads and every real pork image candidate", () => {
  const model = buildAdminRangeReportModel({
    reportOrganization: "dti",
    reportStartDate: "2026-08-01",
    reportEndDate: "2026-08-03",
    generatedAt: "Aug 3, 2026 10:40 AM",
    generatedBy: "admin@example.com",
    summary: {
      total: 4,
      averageConfidence: 89,
      spoiledRate: 25,
      uniqueInspectors: 2,
      uniqueLocations: 2,
      flaggedRecords: 1,
    },
    reportRows: [
      {
        createdAt: "2026-08-03 10:00:00",
        capturedAt: "2026-08-03 10:00:00",
        inspector: "Inspector One",
        location: "East Market",
        meatType: "pork",
        classification: "warning",
        confidenceScore: 88,
        imageUrl: "https://example.com/pork-latest.jpg",
      },
      {
        createdAt: "2026-08-02 08:00:00",
        capturedAt: "2026-08-02 08:00:00",
        inspector: "Inspector Two",
        location: "West Market",
        meatType: "pork",
        classification: "fresh",
        confidenceScore: 92,
        imageUrl: "https://example.com/pork-earlier.jpg",
      },
      {
        createdAt: "2026-08-01 09:00:00",
        capturedAt: null,
        inspector: "Inspector Three",
        location: "West Market",
        meatType: "pork",
        classification: "fresh",
        confidenceScore: 90,
        imageUrl: null,
      },
      {
        createdAt: "2026-08-01 07:30:00",
        capturedAt: "2026-08-01 07:30:00",
        inspector: "Inspector Four",
        location: "Fish Market",
        meatType: "fish",
        classification: "acceptable",
        confidenceScore: 84,
        imageUrl: "https://example.com/fish.jpg",
      },
    ],
  });

  const graphSection = model.sections.find((section) => section.id === "report-graphs");
  const porkGallery = model.sections.find((section) => section.id === "pork-gallery");

  assert.ok(graphSection?.charts);
  assert.equal(graphSection?.charts?.length, 3);
  assert.deepEqual(
    graphSection?.charts?.map((chart) => chart.title),
    [
      "Classification Breakdown",
      "Daily Inspection Trend",
      "Meat Type Breakdown",
    ],
  );

  assert.ok(porkGallery?.inspectionEvidence);
  assert.deepEqual(
    porkGallery?.inspectionEvidence?.map((item) => item.imageUrl),
    [
      "https://example.com/pork-latest.jpg",
      "https://example.com/pork-earlier.jpg",
    ],
  );
  assert.deepEqual(
    porkGallery?.inspectionEvidence?.map((item) => item.inspectorLabel),
    ["Inspector One", "Inspector Two"],
  );
});
