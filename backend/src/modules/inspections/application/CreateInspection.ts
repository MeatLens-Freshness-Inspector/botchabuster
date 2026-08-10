import type { CreateInspectionResult, InspectionService } from "../infrastructure/InspectionService";
import type { InspectionInsert } from "../../../types/inspection";
export class CreateInspection {
  constructor(private readonly service: Pick<InspectionService, "create">) {}
  execute(input: InspectionInsert, userId: string): Promise<CreateInspectionResult> { return this.service.create(input, userId); }
}
