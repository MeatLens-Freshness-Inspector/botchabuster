import type { PasskeyService } from "../infrastructure/PasskeyService";
export class BeginPasskeyAuthentication {
  constructor(private readonly service: Pick<PasskeyService, "beginAuthentication">) {}
  execute(origin: string): ReturnType<PasskeyService["beginAuthentication"]> { return this.service.beginAuthentication(origin); }
}
