import type { AuthUser } from "../infrastructure/SupabaseAuthOperations";
import type { PasskeyService } from "../infrastructure/PasskeyService";
export class BeginPasskeyRegistration {
  constructor(private readonly service: Pick<PasskeyService, "beginRegistration">) {}
  execute(user: AuthUser, origin: string): ReturnType<PasskeyService["beginRegistration"]> { return this.service.beginRegistration(user, origin); }
}
