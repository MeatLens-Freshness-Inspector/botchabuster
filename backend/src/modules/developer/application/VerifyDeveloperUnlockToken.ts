import type { DeveloperOptionsService } from "../infrastructure/DeveloperOptionsService";
export class VerifyDeveloperUnlockToken {
  constructor(private readonly service: Pick<DeveloperOptionsService, "verifyUnlockToken">) {}
  execute(token: string, userId: string): boolean { return this.service.verifyUnlockToken(token, userId); }
}
