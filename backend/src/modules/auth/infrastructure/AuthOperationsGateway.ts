import type { SignInInput } from "./SupabaseAuthOperations";
import type { AuthGateway, AuthGatewayUser } from "../domain/ports/AuthGateway";

interface AuthOperations {
  signIn(input: SignInInput): Promise<{
    user: AuthGatewayUser | null;
    session: unknown;
  }>;
}

export class AuthOperationsGateway implements AuthGateway {
  constructor(private readonly operations: AuthOperations) {}

  async signIn(email: string, password: string): Promise<AuthGatewayUser> {
    const result = await this.operations.signIn({ email, password });
    if (!result.user) {
      throw new Error("Sign in failed: user record missing");
    }

    return result.user;
  }
}
