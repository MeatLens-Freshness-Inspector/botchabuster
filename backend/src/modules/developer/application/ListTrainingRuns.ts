import type { DeveloperDashboardService } from "../infrastructure/DeveloperDashboardService";
export class ListTrainingRuns {
  constructor(private readonly service: Pick<DeveloperDashboardService, "listTrainingRuns">) {}
  execute(): ReturnType<DeveloperDashboardService["listTrainingRuns"]> { return this.service.listTrainingRuns(); }
}
