import type { InspectionScope, InspectionService } from "../infrastructure/InspectionService";
import type { Inspection } from "../../../types/inspection";
export class ListInspections {
  constructor(private readonly service: Pick<InspectionService, "getAll">) {}
  execute(limit: number, offset: number, userId: string, scope: InspectionScope, isAdmin: boolean): Promise<Inspection[]> {
    return this.service.getAll(limit, offset, userId, scope, isAdmin);
  }
}
