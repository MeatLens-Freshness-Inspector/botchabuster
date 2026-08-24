import type {
  InspectionResultDispute,
  InspectionResultDisputeMutation,
  InspectionResultDisputeRecord,
  InspectionResultDisputeReviewDecision,
} from "../../../../types/inspectionResultDispute";
import type { Inspection } from "../../../../types/inspection";

export type CreateInspectionResultDisputeInput = {
  inspectionId: string;
  submittedBy: string;
  expectedClassification: Inspection["classification"];
  reason: string;
};

export interface InspectionResultDisputeRepository {
  create(input: CreateInspectionResultDisputeInput): Promise<InspectionResultDispute>;
  listForInspector(submittedBy: string): Promise<InspectionResultDisputeRecord[]>;
  listPendingForReview(): Promise<InspectionResultDisputeRecord[]>;
  applyToDeveloperDataset(disputeId: string, actorId: string): Promise<InspectionResultDisputeMutation>;
  review(
    disputeId: string,
    actorId: string,
    decision: InspectionResultDisputeReviewDecision,
    reviewerNote: string | null,
  ): Promise<InspectionResultDisputeMutation>;
}
