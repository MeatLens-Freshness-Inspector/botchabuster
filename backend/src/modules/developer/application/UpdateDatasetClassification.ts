import type { DeveloperDashboardService } from "../infrastructure/DeveloperDashboardService";
import type { DeveloperDatasetClassification } from "../../../types/developerDashboard";
export class UpdateDatasetClassification {
  constructor(private readonly service: Pick<DeveloperDashboardService, "updateDatasetManualClassification">) {}
  execute(inspectionId: string, classification: DeveloperDatasetClassification): ReturnType<DeveloperDashboardService["updateDatasetManualClassification"]> {
    return this.service.updateDatasetManualClassification(inspectionId, classification);
  }
}
