import type { AuthUser } from "../infrastructure/SupabaseAuthOperations";
export interface EmailUpdateGateway { updateEmail(userId: string, email: string): Promise<AuthUser>; }
export class UpdateEmail {
  constructor(private readonly gateway: EmailUpdateGateway) {}
  execute(userId: string, email: string): Promise<AuthUser> { return this.gateway.updateEmail(userId, email); }
}
