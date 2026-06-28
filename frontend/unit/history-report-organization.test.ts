import assert from "node:assert/strict";
import test from "node:test";
import { buildDetailedHistoryReportHtml } from "../src/pages/user/history/utils/historyPage";

const inspections = [
  {
    id: "inspection-1",
    user_id: "user-1",
    meat_type: "pork",
    classification: "fresh",
    confidence_score: 95,
    flagged_deviations: [],
    explanation: "Looks fresh",
    image_url: null,
    location: "North Market",
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
