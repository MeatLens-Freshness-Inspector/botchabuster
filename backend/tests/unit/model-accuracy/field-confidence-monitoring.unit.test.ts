import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildFieldConfidenceMonitoring,
  selectHighConfidenceApprovedDisputes,
  type FieldConfidenceObservation,
} from "../../../src/modules/model-accuracy/domain/modelCalibration";

const observations: FieldConfidenceObservation[] = [
  {
    inspectionId: "inspection-approved",
    originalPrediction: "fresh",
    originalConfidence: 0.8,
    disputeStatus: "approved",
    disputeDate: "2026-09-01T00:00:00.000Z",
    resolutionDate: "2026-09-02T00:00:00.000Z",
    disputeResult: "spoiled",
    modelVersionKey: "model-a",
  },
  {
    inspectionId: "inspection-rejected",
    originalPrediction: "spoiled",
    originalConfidence: 0.9,
    disputeStatus: "rejected",
    disputeDate: "2026-09-03T00:00:00.000Z",
    resolutionDate: "2026-09-04T00:00:00.000Z",
    disputeResult: null,
    modelVersionKey: "model-a",
  },
  {
    inspectionId: "inspection-pending",
    originalPrediction: "not fresh",
    originalConfidence: 0.1,
    disputeStatus: "pending",
    disputeDate: "2026-09-05T00:00:00.000Z",
    resolutionDate: null,
    disputeResult: "fresh",
    modelVersionKey: null,
  },
  {
    inspectionId: "inspection-none",
    originalPrediction: "fresh",
    originalConfidence: 0.8,
    disputeStatus: "none",
    disputeDate: null,
    resolutionDate: null,
    disputeResult: null,
    modelVersionKey: "model-a",
  },
];

test("field monitoring separates dispute, approved, rejected, and pending observations", () => {
  const monitoring = buildFieldConfidenceMonitoring(observations);
  assert.equal(monitoring.buckets.length, 10);
  assert.deepEqual(monitoring.buckets[0], {
    binIndex: 0,
    lowerBound: 0,
    upperBound: 0.1,
    sampleCount: 0,
    disputeCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    pendingCount: 0,
    disputeRate: null,
  });
  assert.equal(monitoring.buckets[1].pendingCount, 1);
  assert.equal(monitoring.buckets[1].disputeRate, 1);
  assert.equal(monitoring.buckets[8].sampleCount, 2);
  assert.equal(monitoring.buckets[8].approvedCount, 1);
  assert.equal(monitoring.buckets[8].disputeRate, 0.5);
  assert.equal(monitoring.buckets[9].rejectedCount, 1);
});

test("field monitoring leaves dispute rate null when a bucket has no available denominator", () => {
  const monitoring = buildFieldConfidenceMonitoring([{
    ...observations[0],
    denominatorAvailable: false,
  }]);
  assert.equal(monitoring.buckets[8].approvedCount, 1);
  assert.equal(monitoring.buckets[8].disputeRate, null);
});

test("high-confidence approved selection preserves original prediction and dates", () => {
  const selected = selectHighConfidenceApprovedDisputes(observations);
  assert.equal(selected.length, 1);
  assert.deepEqual(selected[0], {
    inspectionId: "inspection-approved",
    originalPrediction: "fresh",
    originalConfidence: 0.8,
    disputeResult: "spoiled",
    disputeDate: "2026-09-01T00:00:00.000Z",
    resolutionDate: "2026-09-02T00:00:00.000Z",
    modelVersionKey: "model-a",
  });
});
