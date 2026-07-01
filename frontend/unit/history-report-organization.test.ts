import assert from "node:assert/strict";
import test from "node:test";
import { buildDetailedHistoryReportHtml } from "../src/pages/user/history/utils/historyPage";

const inspections = [
  {
    id: "inspection-1",
    user_id: "user-1",
    meat_type: "pork",
    classification: "spoiled",
    confidence_score: 100,
    flagged_deviations: ["failed_pre_scan_safety_protocol"],
    explanation: "Automatically classified as spoiled due to failed pre-scan safety protocol. AI analysis was skipped.",
    image_url: null,
    location: "North Market",
    location_latitude: 14.5995,
    location_longitude: 120.9842,
    stall_number: "12-A",
    meat_inspection_certificate_proof: "CERT-77",
    meat_expiry_date: "2026-07-10",
    storage_correct: true,
    light_color_correct: false,
    light_color_observed: "green",
    area_clean: true,
    inspection_decision_source: "protocol_pre_scan",
    protocol_spoiled_reason: "failed_pre_scan_safety_protocol",
    inspector_notes: "No issues",
    created_at: "2026-06-28T08:00:00.000Z",
    updated_at: "2026-06-28T08:00:00.000Z",
  },
];

test("renders the selected organization header for DTI reports", () => {
  const html = buildDetailedHistoryReportHtml({
    averageConfidence: 95,
    generatedAt: "Jun 28, 2026 8:30 AM",
    inspections: inspections as any,
    selectedReportDay: "2026-06-28",
    reportOrganization: "dti",
  });

  assert.match(html, /DTI/);
  assert.match(html, /Inspector Daily Detailed Report/);
  assert.match(html, /North Market \| Lat: 14.599500 \| Long: 120.984200/);
  assert.match(html, /Pre-scan protocol/i);
  assert.match(html, /Stall Number:<\/strong>\s*12-A/i);
  assert.match(html, /Light Color Observed:<\/strong>\s*green/i);
});

test("falls back to Gordon College CCS when the profile organization is missing", () => {
  const html = buildDetailedHistoryReportHtml({
    averageConfidence: 95,
    generatedAt: "Jun 28, 2026 8:30 AM",
    inspections: inspections as any,
    selectedReportDay: "2026-06-28",
    reportOrganization: null,
  });

  assert.match(html, /Gordon College CCS/);
  assert.match(html, /Inspector Daily Detailed Report/);
});
