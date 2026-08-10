import type { PasskeyService } from "../infrastructure/PasskeyService";
export class DeletePasskey {
  constructor(private readonly service: Pick<PasskeyService, "deletePasskey">) {}
  execute(userId: string, credentialId: string): Promise<void> { return this.service.deletePasskey(userId, credentialId); }
}
