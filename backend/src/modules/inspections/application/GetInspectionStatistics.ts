import type { InspectionScope, InspectionService } from "../infrastructure/InspectionService";
export class GetInspectionStatistics {
  constructor(private readonly service: Pick<InspectionService, "getStatistics">) {}
  execute(userId: string, scope: InspectionScope, isAdmin: boolean): ReturnType<InspectionService["getStatistics"]> {
    return this.service.getStatistics(userId, scope, isAdmin);
  }
}
