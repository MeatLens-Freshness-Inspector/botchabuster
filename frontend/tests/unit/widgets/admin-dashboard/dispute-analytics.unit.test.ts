import assert from "node:assert/strict";
import test from "node:test";
import type { Inspection, InspectionResultDispute } from "../../../../src/entities/inspection";
import {
  buildDisputeAnalytics,
  filterDisputesByDateRange,
} from "../../../../src/widgets/admin-dashboard/model/dispute-analytics";

function makeDispute(
  id: string,
  inspectionId: string,
  status: InspectionResultDispute["status"],
  createdAt: string,
): InspectionResultDispute {
  return {
    id,
    inspection_id: inspectionId,
    submitted_by: "inspector-1",
    expected_classification: "spoiled",
    reason: "The inspection result needs review.",
    status,
    developer_label_applied_at: null,
    developer_label_applied_by: null,
    reviewed_at: status === "pending" ? null : createdAt,
    reviewed_by: status === "pending" ? null : "admin-1",
    reviewer_note: null,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

function makeInspection(id: string, createdAt = "2026-09-01T12:00:00.000Z"): Inspection {
  return {
    id,
    user_id: "inspector-1",
    meat_type: "pork",
    classification: "fresh",
    confidence_score: 90,
    flagged_deviations: [],
    explanation: null,
    image_url: null,
    location: "Market A",
    location_latitude: null,
    location_longitude: null,
    inspector_notes: null,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

test("builds dispute KPIs from unique disputed inspections", () => {
  const result = buildDisputeAnalytics({
    disputes: [
      makeDispute("d-1", "i-1", "pending", "2026-09-01T08:00:00.000Z"),
      makeDispute("d-2", "i-1", "approved", "2026-09-02T08:00:00.000Z"),
      makeDispute("d-3", "i-2", "rejected", "2026-09-03T08:00:00.000Z"),
    ],
    inspections: [makeInspection("i-1"), makeInspection("i-2"), makeInspection("i-3"), makeInspection("i-4")],
  });

  assert.deepEqual(result.summary, { total: 3, pending: 1, approved: 1, rejected: 1, disputeRate: 50 });
  assert.deepEqual(result.statusDistribution.map(({ status, count }) => ({ status, count })), [
    { status: "pending", count: 1 },
    { status: "approved", count: 1 },
    { status: "rejected", count: 1 },
  ]);
  assert.deepEqual(result.dailyTrend, [
    { date: "2026-09-01", count: 1 },
    { date: "2026-09-02", count: 1 },
    { date: "2026-09-03", count: 1 },
  ]);
});

test("filters dispute creation dates inclusively and handles empty data", () => {
  const disputes = [
    makeDispute("d-1", "i-1", "pending", "2026-09-01T00:00:00.000Z"),
    makeDispute("d-2", "i-2", "approved", "2026-09-03T15:59:59.999Z"),
  ];

  assert.equal(filterDisputesByDateRange(disputes, "2026-09-01", "2026-09-03").length, 2);
  assert.deepEqual(buildDisputeAnalytics({ disputes: [], inspections: [] }).summary, {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    disputeRate: 0,
  });
});

test("uses the selected report range for both dispute rows and inspection denominator", () => {
  const result = buildDisputeAnalytics({
    disputes: [
      makeDispute("d-1", "i-1", "approved", "2026-09-01T10:00:00.000Z"),
      makeDispute("d-2", "i-2", "rejected", "2026-09-04T10:00:00.000Z"),
    ],
    inspections: [makeInspection("i-1"), makeInspection("i-2", "2026-09-04T12:00:00.000Z")],
    startDate: "2026-09-01",
    endDate: "2026-09-01",
  });

  assert.equal(result.filteredDisputes.length, 1);
  assert.deepEqual(result.summary, { total: 1, pending: 0, approved: 1, rejected: 0, disputeRate: 100 });
});
