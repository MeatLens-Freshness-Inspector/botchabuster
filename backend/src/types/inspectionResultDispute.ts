import type { Inspection } from "./inspection";

export const DISPUTE_REASON_MIN_LENGTH = 10;
export const DISPUTE_REASON_MAX_LENGTH = 2_000;

export const INSPECTION_RESULT_DISPUTE_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export type InspectionResultDisputeStatus =
  (typeof INSPECTION_RESULT_DISPUTE_STATUSES)[number];

export type InspectionResultDispute = {
  id: string;
  inspection_id: string;
  submitted_by: string;
  expected_classification: Inspection["classification"];
  reason: string;
  status: InspectionResultDisputeStatus;
  developer_label_applied_at: string | null;
  developer_label_applied_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer_note: string | null;
  created_at: string;
  updated_at: string;
};

export type InspectionResultDisputeSubmission = {
  expectedClassification: Inspection["classification"];
  reason: string;
};

export type InspectionResultDisputeReviewDecision = "approved" | "rejected";

export type InspectionResultDisputeMutation = {
  dispute: InspectionResultDispute;
  inspection: Inspection;
  previousManualClassification?: Inspection["classification"] | null;
  previousOfficialClassification?: Inspection["classification"] | null;
};

export type InspectionResultDisputeRecord = InspectionResultDispute & {
  inspection?: Inspection | null;
};

const ALLOWED_CLASSIFICATIONS = new Set<Inspection["classification"]>([
  "fresh",
  "not fresh",
  "spoiled",
  "acceptable",
  "warning",
]);

export function isInspectionResultDisputeStatus(value: unknown): value is InspectionResultDisputeStatus {
  return typeof value === "string" &&
    (INSPECTION_RESULT_DISPUTE_STATUSES as readonly string[]).includes(value);
}

export function assertDisputeSubmission(input: {
  expectedClassification: unknown;
  reason: unknown;
}): {
  expectedClassification: Inspection["classification"];
  reason: string;
} {
  const expectedClassification = typeof input.expectedClassification === "string"
    ? input.expectedClassification.trim().toLowerCase()
    : "";

  if (!ALLOWED_CLASSIFICATIONS.has(expectedClassification as Inspection["classification"])) {
    throw new Error("expectedClassification is invalid");
  }

  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason.length < DISPUTE_REASON_MIN_LENGTH || reason.length > DISPUTE_REASON_MAX_LENGTH) {
    throw new Error("reason must be between 10 and 2000 characters");
  }

  return {
    expectedClassification: expectedClassification as Inspection["classification"],
    reason,
  };
}
