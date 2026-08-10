import type { SignInInput } from "../../../services/AuthService";
import type { AuthGateway, AuthGatewayUser } from "../domain/ports/AuthGateway";

interface LegacyAuthService {
  signIn(input: SignInInput): Promise<{
    user: AuthGatewayUser | null;
    session: unknown;
  }>;
}

export class AuthServiceGateway implements AuthGateway {
  constructor(private readonly legacyAuthService: LegacyAuthService) {}

  async signIn(email: string, password: string): Promise<AuthGatewayUser> {
    const result = await this.legacyAuthService.signIn({ email, password });
    if (!result.user) {
      throw new Error("Sign in failed: user record missing");
    }

    return result.user;
  }
}
