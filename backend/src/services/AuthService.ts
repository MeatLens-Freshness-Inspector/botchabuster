import {
  SupabaseAuthOperations,
  type AuthSession,
  type AuthUser,
  type SignInInput,
  type SignUpInput,
} from "../modules/auth/infrastructure/SupabaseAuthOperations";
import { createSupabaseAuthOperations } from "../modules/auth/infrastructure/SupabaseAuthFactory";
import type { AppSession } from "../modules/auth/infrastructure/AppSessionService";

export type { AuthSession, AuthUser, SignInInput, SignUpInput } from "../modules/auth/infrastructure/SupabaseAuthOperations";

/** @deprecated Compatibility facade. Business logic lives in the auth module. */
export class AuthService {
  private static instance: AuthService;

  private constructor(
    private readonly operations = createSupabaseAuthOperations(),
  ) {}

  static getInstance(): AuthService {
    if (!AuthService.instance) AuthService.instance = new AuthService();
    return AuthService.instance;
  }

  signIn(input: SignInInput) {
    return this.operations.signIn(input);
  }

  signUp(input: SignUpInput) {
    return this.operations.signUp(input);
  }

  signOut(): Promise<void> {
    return this.operations.signOut();
  }

  createAppSession(user: AuthUser): AppSession {
    return this.operations.createAppSession(user);
  }

  sendPasswordReset(email: string, redirectTo?: string): Promise<void> {
    return this.operations.sendPasswordReset(email, redirectTo);
  }

  updateEmail(userId: string, email: string): Promise<AuthUser> {
    return this.operations.updateEmail(userId, email);
  }

  updatePassword(userId: string, password: string): Promise<void> {
    return this.operations.updatePassword(userId, password);
  }

  getUserByAccessToken(accessToken: string): Promise<AuthUser> {
    return this.operations.getUserByAccessToken(accessToken);
  }

  updatePasswordWithRecoveryToken(accessToken: string, password: string): Promise<void> {
    return this.operations.updatePasswordWithRecoveryToken(accessToken, password);
  }
}

export const authService = AuthService.getInstance();
