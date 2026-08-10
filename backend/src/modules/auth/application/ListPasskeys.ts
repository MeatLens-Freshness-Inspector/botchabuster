import type { PasskeyService, RegisteredPasskey } from "../infrastructure/PasskeyService";
export class ListPasskeys {
  constructor(private readonly service: Pick<PasskeyService, "listPasskeys">) {}
  execute(userId: string): Promise<RegisteredPasskey[]> { return this.service.listPasskeys(userId); }
}
