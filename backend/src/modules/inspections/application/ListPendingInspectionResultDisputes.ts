import type { InspectionResultDisputeRecord } from "../../../types/inspectionResultDispute";
import type { InspectionResultDisputeRepository } from "../domain/ports/InspectionResultDisputeRepository";

export class ListPendingInspectionResultDisputes {
  constructor(private readonly repository: InspectionResultDisputeRepository) {}

  execute(): Promise<InspectionResultDisputeRecord[]> {
    return this.repository.listPendingForReview() as Promise<InspectionResultDisputeRecord[]>;
  }
}
