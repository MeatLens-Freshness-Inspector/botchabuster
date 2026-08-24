import type {
  InspectionResultDisputeRecord,
} from "../../../types/inspectionResultDispute";
import type { InspectionResultDisputeRepository } from "../domain/ports/InspectionResultDisputeRepository";

export class ListInspectionResultDisputes {
  constructor(private readonly repository: InspectionResultDisputeRepository) {}

  execute(submittedBy: string): Promise<InspectionResultDisputeRecord[]> {
    return this.repository.listForInspector(submittedBy) as Promise<InspectionResultDisputeRecord[]>;
  }
}
