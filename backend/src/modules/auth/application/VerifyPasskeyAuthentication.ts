import type { PasskeyService } from "../infrastructure/PasskeyService";
export class VerifyPasskeyAuthentication {
  constructor(private readonly service: Pick<PasskeyService, "verifyAuthentication">) {}
  execute(input: Parameters<PasskeyService["verifyAuthentication"]>[0]): ReturnType<PasskeyService["verifyAuthentication"]> { return this.service.verifyAuthentication(input); }
}
