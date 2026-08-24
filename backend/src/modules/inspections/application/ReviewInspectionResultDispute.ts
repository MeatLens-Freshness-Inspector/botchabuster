import type {
  InspectionResultDisputeMutation,
  InspectionResultDisputeReviewDecision,
} from "../../../types/inspectionResultDispute";
import type { InspectionResultDisputeRepository } from "../domain/ports/InspectionResultDisputeRepository";

export class ReviewInspectionResultDispute {
  constructor(private readonly repository: InspectionResultDisputeRepository) {}

  async execute(
    disputeId: string,
    actorId: string,
    decision: InspectionResultDisputeReviewDecision | string,
    reviewerNote: string | null,
  ): Promise<InspectionResultDisputeMutation> {
    const normalizedDisputeId = disputeId.trim();
    const normalizedActorId = actorId.trim();
    const normalizedDecision = decision.trim().toLowerCase();
    if (!normalizedDisputeId || !normalizedActorId) {
      throw new Error("Dispute and actor are required");
    }
    if (normalizedDecision !== "approved" && normalizedDecision !== "rejected") {
      throw new Error("decision must be approved or rejected");
    }

    const normalizedNote = typeof reviewerNote === "string" ? reviewerNote.trim() || null : null;
    return this.repository.review(
      normalizedDisputeId,
      normalizedActorId,
      normalizedDecision as InspectionResultDisputeReviewDecision,
      normalizedNote,
    );
  }
}
