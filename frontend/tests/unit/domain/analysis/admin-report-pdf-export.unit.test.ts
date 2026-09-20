import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminDashboardReportPdfModel } from "../../../../src/widgets/admin-dashboard";

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
    disputeAnalytics: {
      summary: { total: 2, pending: 1, approved: 1, rejected: 0, disputeRate: 11 },
      statusDistribution: [
        { status: "pending", count: 1 },
        { status: "approved", count: 1 },
        { status: "rejected", count: 0 },
      ],
      dailyTrend: [{ date: "2026-07-20", count: 2 }],
      filteredDisputes: [{
        id: "dispute-1",
        created_at: "2026-07-20T09:00:00.000Z",
        inspection_id: "inspection-1",
        submitted_by: "user-1",
        expected_classification: "spoiled",
        status: "approved",
        reason: "Review requested",
        reviewed_at: "2026-07-21T09:00:00.000Z",
        reviewed_by: "admin-1",
        reviewer_note: "Approved",
        developer_label_applied_at: null,
        inspection: { meat_type: "pork", classification: "fresh" },
      }],
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
        regulatoryCompliance: "Not available",
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
  const disputeSection = model.sections.find((section) => section.id === "dispute-analytics");
  assert.equal(disputeSection?.metrics?.[0].value, "2");
  assert.equal(disputeSection?.tables?.[0].rows[0][1], "inspection-1");
});

test("buildAdminDashboardReportPdfModel preserves graph payloads and nullable pork image urls", () => {
  const model = buildAdminDashboardReportPdfModel({
    reportOrganization: "city_veterinary_office_olongapo",
    reportStartDate: "2026-08-01",
    reportEndDate: "2026-08-03",
    generatedAt: "Aug 3, 2026 10:40 AM",
    generatedBy: "admin@example.com",
    reportSummary: {
      total: 2,
      averageConfidence: 90,
      spoiledRate: 0,
      uniqueInspectors: 2,
      uniqueLocations: 2,
      flaggedRecords: 0,
    },
    reportRows: [
      {
        id: "inspection-1",
        createdAt: "2026-08-03T10:00:00.000Z",
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
        meatExpiryDate: "2026-08-05",
        storageCorrect: "Yes",
        lightColorCorrect: "Yes",
        lightColorObserved: "-",
        areaClean: "Yes",
        regulatoryCompliance: "Compliant",
        regulatoryComplianceReason: "All pre-scan safety checks passed.",
        flaggedDeviations: "-",
        explanation: "Looks good",
        inspectorNotes: "Routine check",
        imageUrl: "https://example.com/city-vet-pork.jpg",
      },
      {
        id: "inspection-2",
        createdAt: "2026-08-02T08:00:00.000Z",
        capturedAt: null,
        inspector: "B. Cruz",
        inspectorEmail: "b.cruz@example.com",
        inspectorCode: "INSP-02",
        manualLocation: "West Tapinac",
        location: "West Tapinac | Lat: 14.838100 | Long: 120.284000",
        locationLatitude: 14.8381,
        locationLongitude: 120.284,
        profileLocation: "West Tapinac",
        meatType: "pork",
        classification: "warning",
        confidenceScore: 87,
        decisionSource: "AI analysis",
        protocolSpoiledReason: "-",
        stallNumber: "14-B",
        certificateProof: "CERT-02",
        meatExpiryDate: "2026-08-06",
        storageCorrect: "Yes",
        lightColorCorrect: "Yes",
        lightColorObserved: "-",
        areaClean: "Yes",
        regulatoryCompliance: "Not available",
        flaggedDeviations: "-",
        explanation: "Review needed",
        inspectorNotes: "Second pass",
        imageUrl: null,
      },
    ],
  });

  const graphSection = model.sections.find((section) => section.id === "report-graphs");
  const porkGallery = model.sections.find((section) => section.id === "pork-gallery");

  assert.ok(graphSection?.charts);
  assert.equal(graphSection?.charts?.[0].points.length, 2);
  assert.ok(porkGallery?.inspectionEvidence);
  assert.equal(porkGallery?.inspectionEvidence?.length, 1);
  assert.equal(
    porkGallery?.inspectionEvidence?.[0].imageUrl,
    "https://example.com/city-vet-pork.jpg",
  );
  assert.equal(
    porkGallery?.inspectionEvidence?.[0].regulatoryCompliance,
    "Compliant",
  );
  assert.equal(
    porkGallery?.inspectionEvidence?.[0].regulatoryComplianceReason,
    "All pre-scan safety checks passed.",
  );

  const detailSection = model.sections.find((section) => section.id === "meat-detail");
  assert.deepEqual(detailSection?.tables?.[0].columns, [
    "Created",
    "Inspector",
    "Location",
    "Meat",
    "Meat Type Scope",
    "Classification",
    "Confidence",
    "Regulatory Compliance",
  ]);
  assert.equal(detailSection?.tables?.[0].rows[0][7], "Compliant");
});
