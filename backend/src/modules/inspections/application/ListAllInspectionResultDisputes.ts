import type { InspectionResultDisputeRecord } from "../../../types/inspectionResultDispute";
import type { InspectionResultDisputeRepository } from "../domain/ports/InspectionResultDisputeRepository";

export class ListAllInspectionResultDisputes {
  constructor(private readonly repository: InspectionResultDisputeRepository) {}

  execute(): Promise<InspectionResultDisputeRecord[]> {
    return this.repository.listAllForReview();
  }
}
