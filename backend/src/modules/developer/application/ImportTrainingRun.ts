import type { DeveloperDashboardService } from "../infrastructure/DeveloperDashboardService";
export class ImportTrainingRun {
  constructor(private readonly service: Pick<DeveloperDashboardService, "importTrainingRunPackage">) {}
  execute(filePath: string): ReturnType<DeveloperDashboardService["importTrainingRunPackage"]> { return this.service.importTrainingRunPackage(filePath); }
}
