import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminDashboardReportPdfModel } from "../../src/pages/admin-dashboard/utils/adminDashboard";

test("buildAdminDashboardReportPdfModel preserves the organization overview and shared meat sections", () => {
  const model = buildAdminDashboardReportPdfModel({
    reportOrganization: "dti",
    reportStartDate: "2026-07-01",
    reportEndDate: "2026-07-31",
    generatedAt: "Aug 2, 2026 6:00 PM",
    generatedBy: "admin@example.com",
    reportSummary: {
      total: 18,
      averageConfidence: 91,
      spoiledRate: 11,
      uniqueInspectors: 4,
      uniqueLocations: 3,
      flaggedRecords: 2,
    },
    reportRows: [
      {
        id: "inspection-1",
        createdAt: "2026-07-20T08:00:00.000Z",
        capturedAt: null,
        inspector: "A. Reyes",
        inspectorEmail: "a.reyes@example.com",
        inspectorCode: "INSP-01",
        manualLocation: "East Tapinac",
        location: "East Tapinac | Lat: 14.838600 | Long: 120.284200",
        locationLatitude: 14.8386,
        locationLongitude: 120.2842,
        profileLocation: "East Tapinac",
        meatType: "pork",
        classification: "fresh",
        confidenceScore: 93,
        decisionSource: "AI analysis",
        protocolSpoiledReason: "-",
        stallNumber: "12-A",
        certificateProof: "CERT-01",
        meatExpiryDate: "2026-07-22",
        storageCorrect: "Yes",
        lightColorCorrect: "Yes",
        lightColorObserved: "-",
        areaClean: "Yes",
        flaggedDeviations: "-",
        explanation: "Looks good",
        inspectorNotes: "Routine check",
        imageUrl: "-",
      },
    ],
  });

  assert.equal(model.kind, "admin_range");
  assert.equal(model.templateKey, "dti");
  assert.ok(model.sections.some((section) => section.id === "org-overview"));
  assert.ok(model.sections.some((section) => section.id === "meat-summary"));
  assert.ok(model.sections.some((section) => section.id === "meat-detail"));
});
