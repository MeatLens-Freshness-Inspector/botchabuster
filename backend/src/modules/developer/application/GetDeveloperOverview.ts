import type { DeveloperDashboardService } from "../infrastructure/DeveloperDashboardService";
export class GetDeveloperOverview {
  constructor(private readonly service: Pick<DeveloperDashboardService, "getOverview">) {}
  execute(): ReturnType<DeveloperDashboardService["getOverview"]> { return this.service.getOverview(); }
}
