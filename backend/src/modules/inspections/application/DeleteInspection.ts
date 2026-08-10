import type { InspectionService } from "../infrastructure/InspectionService";
export class DeleteInspection {
  constructor(private readonly service: Pick<InspectionService, "delete">) {}
  execute(id: string, userId: string, isAdmin: boolean): Promise<void> { return this.service.delete(id, userId, isAdmin); }
}
