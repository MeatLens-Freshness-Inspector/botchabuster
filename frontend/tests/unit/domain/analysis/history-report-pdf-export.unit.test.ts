import assert from "node:assert/strict";
import test from "node:test";

import { formatReportDateTime } from "../../../../src/lib/reports/formatting";
import { buildDetailedHistoryReportPdfModel } from "../../../../src/pages/user/history/utils/historyPage";
import type { Inspection } from "../../../../src/types/inspection";

const sampleInspection: Inspection = {
  id: "inspection-1",
  user_id: "user-1",
  meat_type: "pork",
  classification: "fresh",
  confidence_score: 92,
  flagged_deviations: [],
  explanation: "Looks good",
  image_url: null,
  location: "East Tapinac",
  location_latitude: 14.8386,
  location_longitude: 120.2842,
  stall_number: "12-A",
  meat_inspection_certificate_proof: "CERT-001",
  meat_expiry_date: "2026-08-03",
  storage_correct: true,
  light_color_correct: true,
  light_color_observed: null,
  area_clean: true,
  inspection_decision_source: "ai",
  protocol_spoiled_reason: null,
  inspector_notes: "Daily sample",
  manual_classification: undefined,
  captured_at: null,
  created_at: "2026-08-01T08:00:00.000Z",
  updated_at: "2026-08-01T08:00:00.000Z",
};

test("buildDetailedHistoryReportPdfModel produces an inspector pdf model with the selected day in the subtitle", () => {
  const model = buildDetailedHistoryReportPdfModel({
    reportOrganization: "gordon_college_ccs",
    selectedReportDay: "2026-08-01",
    generatedAt: "Aug 2, 2026 5:00 PM",
    averageConfidence: 92,
    inspections: [sampleInspection],
  });

  assert.equal(model.kind, "inspector_daily");
  assert.equal(model.templateKey, "gcccs");
  assert.match(model.subtitle, /2026-08-01/);
  assert.ok(model.sections.some((section) => section.id === "meat-summary"));
  assert.ok(model.sections.some((section) => section.id === "meat-detail"));
});

test("buildDetailedHistoryReportPdfModel falls back to gcccs when the report organization is missing", () => {
  const model = buildDetailedHistoryReportPdfModel({
    reportOrganization: null,
    selectedReportDay: "2026-08-01",
    generatedAt: "Aug 2, 2026 5:00 PM",
    averageConfidence: 92,
    inspections: [sampleInspection],
  });

  assert.equal(model.organization, "gordon_college_ccs");
  assert.equal(model.templateKey, "gcccs");
});

test("buildDetailedHistoryReportPdfModel carries captured_at fallback and image_url into inspector evidence", () => {
  const model = buildDetailedHistoryReportPdfModel({
    reportOrganization: "city_veterinary_office_olongapo",
    selectedReportDay: "2026-08-01",
    generatedAt: "Aug 2, 2026 5:00 PM",
    averageConfidence: 92,
    inspections: [
      {
        ...sampleInspection,
        captured_at: null,
        image_url: "https://example.com/city-vet-sample.jpg",
      },
    ],
  });

  const detailSection = model.sections.find((section) => section.id === "meat-detail");

  assert.ok(detailSection?.inspectionEvidence);
  assert.equal(
    detailSection?.inspectionEvidence?.[0].capturedAt,
    formatReportDateTime("2026-08-01T08:00:00.000Z"),
  );
  assert.equal(
    detailSection?.inspectionEvidence?.[0].imageUrl,
    "https://example.com/city-vet-sample.jpg",
  );
});
