import type { InspectionResultDisputeMutation } from "../../../types/inspectionResultDispute";
import type { InspectionResultDisputeRepository } from "../domain/ports/InspectionResultDisputeRepository";

export class ApplyDisputeToDeveloperDataset {
  constructor(private readonly repository: InspectionResultDisputeRepository) {}

  execute(disputeId: string, actorId: string): Promise<InspectionResultDisputeMutation> {
    const normalizedDisputeId = disputeId.trim();
    const normalizedActorId = actorId.trim();
    if (!normalizedDisputeId || !normalizedActorId) {
      throw new Error("Dispute and actor are required");
    }

    return this.repository.applyToDeveloperDataset(normalizedDisputeId, normalizedActorId);
  }
}
