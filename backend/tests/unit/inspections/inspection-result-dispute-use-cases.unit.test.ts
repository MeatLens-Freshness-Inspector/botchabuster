import assert from "node:assert/strict";
import { test } from "node:test";
import { ApplyDisputeToDeveloperDataset } from "../../../src/modules/inspections/application/ApplyDisputeToDeveloperDataset";
import { ReviewInspectionResultDispute } from "../../../src/modules/inspections/application/ReviewInspectionResultDispute";
import { SubmitInspectionResultDispute } from "../../../src/modules/inspections/application/SubmitInspectionResultDispute";
import type {
  InspectionResultDispute,
  InspectionResultDisputeMutation,
} from "../../../src/types/inspectionResultDispute";
import type { InspectionResultDisputeRepository } from "../../../src/modules/inspections/domain/ports/InspectionResultDisputeRepository";

const dispute: InspectionResultDispute = {
  id: "dispute-1",
  inspection_id: "inspection-1",
  submitted_by: "inspector-1",
  expected_classification: "spoiled",
  reason: "The sample has visible discoloration and a sour odor.",
  status: "pending",
  developer_label_applied_at: null,
  developer_label_applied_by: null,
  reviewed_at: null,
  reviewed_by: null,
  reviewer_note: null,
  created_at: "2026-08-24T00:00:00.000Z",
  updated_at: "2026-08-24T00:00:00.000Z",
};

function createRepository(overrides: Partial<InspectionResultDisputeRepository> = {}): InspectionResultDisputeRepository {
  return {
    create: async () => dispute,
    applyToDeveloperDataset: async () => ({ dispute } as InspectionResultDisputeMutation),
    review: async () => ({ dispute } as InspectionResultDisputeMutation),
    ...overrides,
  };
}

test("submit dispute validates and normalizes inspector input before persistence", async () => {
  let received: unknown;
  const useCase = new SubmitInspectionResultDispute(createRepository({
    create: async (input) => {
      received = input;
      return dispute;
    },
  }));

  const result = await useCase.execute("inspection-1", "inspector-1", {
    expectedClassification: " SPOILED ",
    reason: "  The sample has visible discoloration and a sour odor.  ",
  });

  assert.equal(result, dispute);
  assert.deepEqual(received, {
    inspectionId: "inspection-1",
    submittedBy: "inspector-1",
    expectedClassification: "spoiled",
    reason: "The sample has visible discoloration and a sour odor.",
  });
});

test("submit dispute does not persist invalid input", async () => {
  let called = false;
  const useCase = new SubmitInspectionResultDispute(createRepository({
    create: async () => {
      called = true;
      return dispute;
    },
  }));

  await assert.rejects(
    () => useCase.execute("inspection-1", "inspector-1", {
      expectedClassification: "raw",
      reason: "The result is wrong.",
    }),
    /expectedClassification is invalid/,
  );
  assert.equal(called, false);
});

test("developer dataset application forwards the actor identity", async () => {
  let received: unknown;
  const useCase = new ApplyDisputeToDeveloperDataset(createRepository({
    applyToDeveloperDataset: async (disputeId, actorId) => {
      received = { disputeId, actorId };
      return { dispute };
    },
  }));

  await useCase.execute("dispute-1", "developer-1");
  assert.deepEqual(received, { disputeId: "dispute-1", actorId: "developer-1" });
});

test("review validates the decision and forwards reviewer data", async () => {
  let received: unknown;
  const useCase = new ReviewInspectionResultDispute(createRepository({
    review: async (disputeId, actorId, decision, reviewerNote) => {
      received = { disputeId, actorId, decision, reviewerNote };
      return { dispute };
    },
  }));

  await useCase.execute("dispute-1", "admin-1", "approved", "Confirmed by the inspection team.");
  assert.deepEqual(received, {
    disputeId: "dispute-1",
    actorId: "admin-1",
    decision: "approved",
    reviewerNote: "Confirmed by the inspection team.",
  });

  await assert.rejects(
    () => useCase.execute("dispute-1", "admin-1", "pending", null),
    /decision must be approved or rejected/,
  );
});
