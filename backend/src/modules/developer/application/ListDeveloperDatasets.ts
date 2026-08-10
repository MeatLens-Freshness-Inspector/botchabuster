import type { DeveloperDashboardService } from "../infrastructure/DeveloperDashboardService";
import type { DeveloperDatasetFilters } from "../../../types/developerDashboard";
export class ListDeveloperDatasets {
  constructor(private readonly service: Pick<DeveloperDashboardService, "listDatasets">) {}
  execute(filters: DeveloperDatasetFilters): ReturnType<DeveloperDashboardService["listDatasets"]> { return this.service.listDatasets(filters); }
}
