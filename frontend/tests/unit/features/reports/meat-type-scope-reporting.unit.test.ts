import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminRangeReportModel } from "../../../../src/features/reports";

test("admin report detail preserves non-pork type and carries its future scope label", () => {
  const model = buildAdminRangeReportModel({
    reportOrganization: "dti",
    reportStartDate: "2026-08-01",
    reportEndDate: "2026-08-01",
    generatedAt: "Aug 1, 2026 10:00 AM",
    generatedBy: "admin@example.com",
    summary: {
      total: 1,
      averageConfidence: 80,
      spoiledRate: 0,
      uniqueInspectors: 1,
      uniqueLocations: 1,
      flaggedRecords: 0,
    },
    reportRows: [{
      createdAt: "2026-08-01 10:00:00",
      capturedAt: null,
      inspector: "Inspector One",
      location: "East Market",
      meatType: "beef",
      meatTypeScopeLabel: "Future validation / research use",
      classification: "fresh",
      confidenceScore: 80,
      regulatoryCompliance: "Not Recorded",
      imageUrl: null,
    }],
  });

  const detailTable = model.sections
    .find((section) => section.id === "meat-detail")
    ?.tables?.[0];

  assert.deepEqual(detailTable?.columns.slice(0, 5), [
    "Created",
    "Inspector",
    "Location",
    "Meat",
    "Meat Type Scope",
  ]);
  assert.equal(detailTable?.rows[0][3], "beef");
  assert.equal(detailTable?.rows[0][4], "Future validation / research use");
});
