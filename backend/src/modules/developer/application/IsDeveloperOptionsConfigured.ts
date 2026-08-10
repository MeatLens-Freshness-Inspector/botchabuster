import type { DeveloperOptionsService } from "../infrastructure/DeveloperOptionsService";
export class IsDeveloperOptionsConfigured {
  constructor(private readonly service: Pick<DeveloperOptionsService, "isConfigured">) {}
  execute(): boolean { return this.service.isConfigured(); }
}
