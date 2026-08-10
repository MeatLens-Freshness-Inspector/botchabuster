import type { DeveloperDashboardService } from "../infrastructure/DeveloperDashboardService";
import type { DeveloperDatasetFilters } from "../../../types/developerDashboard";
export class ExportDeveloperDataset {
  constructor(private readonly service: Pick<DeveloperDashboardService, "exportDatasetZip">) {}
  execute(filters: DeveloperDatasetFilters): ReturnType<DeveloperDashboardService["exportDatasetZip"]> { return this.service.exportDatasetZip(filters); }
}
