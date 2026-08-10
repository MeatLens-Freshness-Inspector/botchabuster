import type { PasskeyService } from "../infrastructure/PasskeyService";
export class VerifyPasskeyRegistration {
  constructor(private readonly service: Pick<PasskeyService, "verifyRegistration">) {}
  execute(input: Parameters<PasskeyService["verifyRegistration"]>[0]): ReturnType<PasskeyService["verifyRegistration"]> { return this.service.verifyRegistration(input); }
}
