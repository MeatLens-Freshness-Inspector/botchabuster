import type { SignUpInput, AuthSession, AuthUser } from "../infrastructure/SupabaseAuthOperations";
export interface SignUpGateway { signUp(input: SignUpInput): Promise<{ user: AuthUser | null; session: AuthSession | null }>; }
export class SignUpUser {
  constructor(private readonly gateway: SignUpGateway) {}
  execute(input: SignUpInput): ReturnType<SignUpGateway["signUp"]> { return this.gateway.signUp(input); }
}
