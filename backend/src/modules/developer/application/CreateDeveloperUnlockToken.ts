import type { DeveloperOptionsService } from "../infrastructure/DeveloperOptionsService";
export class CreateDeveloperUnlockToken {
  constructor(private readonly service: Pick<DeveloperOptionsService, "createUnlockToken">) {}
  execute(userId: string): ReturnType<DeveloperOptionsService["createUnlockToken"]> { return this.service.createUnlockToken(userId); }
}
