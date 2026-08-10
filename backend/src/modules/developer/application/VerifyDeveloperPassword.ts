import type { DeveloperOptionsService } from "../infrastructure/DeveloperOptionsService";
export class VerifyDeveloperPassword {
  constructor(private readonly service: Pick<DeveloperOptionsService, "verifyPassword">) {}
  execute(password: string): boolean { return this.service.verifyPassword(password); }
}
