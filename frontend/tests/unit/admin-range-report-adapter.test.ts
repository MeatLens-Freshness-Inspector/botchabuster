import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminRangeReportModel } from "../../src/lib/reports/adapters/adminRangeReport";

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
      inspector: "Inspector One",
      location: "East Market",
      meatType: "pork",
      classification: "fresh",
      confidenceScore: 93,
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
