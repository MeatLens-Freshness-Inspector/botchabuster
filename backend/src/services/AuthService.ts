import { supabase, supabaseAuth } from "../integrations/supabase";
import { getAppSessionService, type AppSession } from "./AppSessionService";

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthSession {
  access_token: string | null;
  refresh_token: string | null;
  token_type: string | null;
  expires_in: number | null;
  expires_at: number | null;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  fullName?: string;
  accessCode: string;
  emailRedirectTo?: string;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private mapUser(user: { id: string; email?: string | null } | null): AuthUser | null {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email ?? null,
    };
  }

  private mapSession(session: {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    expires_at?: number;
  } | null): AuthSession | null {
    if (!session) return null;
    return {
      access_token: session.access_token ?? null,
      refresh_token: session.refresh_token ?? null,
      token_type: session.token_type ?? null,
      expires_in: session.expires_in ?? null,
      expires_at: session.expires_at ?? null,
    };
  }

  private getSupabaseAuthConfig(): { supabaseUrl: string; supabasePublishableKey: string } {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabasePublishableKey =
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabasePublishableKey) {
      throw new Error("Supabase environment variables are missing");
    }

    return { supabaseUrl, supabasePublishableKey };
  }

  private async ensureProfileExists(user: {
    id: string;
    user_metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfileError) {
      throw new Error(`Failed to verify profile: ${existingProfileError.message}`);
    }

    if (existingProfile) return;

    const fullNameRaw = user.user_metadata?.full_name;
    const accessCodeRaw = user.user_metadata?.access_code;

    const fullName = typeof fullNameRaw === "string" ? fullNameRaw.trim() : "";
    const inspectorCode = typeof accessCodeRaw === "string" ? accessCodeRaw.trim() : "";

    const { error: insertProfileError } = await (supabase
      .from("profiles") as any)
      .insert({
        id: user.id,
        full_name: fullName || null,
        inspector_code: inspectorCode || null,
      });

    if (insertProfileError) {
      throw new Error(`Failed to create missing profile: ${insertProfileError.message}`);
    }
  }

  async signIn(input: SignInInput): Promise<{ user: AuthUser; session: AuthSession | null }> {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: input.email.trim(),
      password: input.password,
    });

    if (error) throw new Error(`Sign in failed: ${error.message}`);

    const user = this.mapUser(data.user);
    if (!user) throw new Error("Sign in failed: user record missing");

    await this.ensureProfileExists({
      id: data.user.id,
      user_metadata: (data.user.user_metadata ?? null) as Record<string, unknown> | null,
    });

    return {
      user,
      session: this.mapSession(data.session),
    };
  }

  async signUp(input: SignUpInput): Promise<{ user: AuthUser | null; session: AuthSession | null }> {
    const accessCode = input.accessCode.trim();
    if (!accessCode) {
      throw new Error("Access code is required");
    }

    const { data: codeIsValid, error: validateError } = await supabase.rpc("validate_access_code", { _code: accessCode });
    if (validateError) throw new Error(`Failed to validate access code: ${validateError.message}`);
    if (!codeIsValid) throw new Error("Access code is invalid, inactive, expired, or no longer available");

    const fullName = input.fullName?.trim() || undefined;

    const { data, error } = await supabaseAuth.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: {
          ...(fullName ? { full_name: fullName } : {}),
          access_code: accessCode,
        },
        ...(input.emailRedirectTo ? { emailRedirectTo: input.emailRedirectTo } : {}),
      },
    });

    if (error) throw new Error(`Sign up failed: ${error.message}`);

    if (data.user) {
      await this.ensureProfileExists({
        id: data.user.id,
        user_metadata: (data.user.user_metadata ?? null) as Record<string, unknown> | null,
      });
    }

    return {
      user: this.mapUser(data.user),
      session: this.mapSession(data.session),
    };
  }

  async signOut(): Promise<void> {
    // Backend is stateless for frontend auth. Sessions are managed client-side.
  }

  createAppSession(user: AuthUser): AppSession {
    return getAppSessionService().createSession(user);
  }

  async sendPasswordReset(email: string, redirectTo?: string): Promise<void> {
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email.trim(), redirectTo ? { redirectTo } : undefined);
    if (error) throw new Error(`Failed to send password reset: ${error.message}`);
  }

  async updateEmail(userId: string, email: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, { email: email.trim() });
    if (error) throw new Error(`Failed to update email: ${error.message}`);

    const user = this.mapUser(data.user);
    if (!user) throw new Error("Failed to update email: user record missing");
    return user;
  }

  async updatePassword(userId: string, password: string): Promise<void> {
    const { error } = await supabase.auth.admin.updateUserById(userId, { password });
    if (error) throw new Error(`Failed to update password: ${error.message}`);
  }

  async getUserByAccessToken(accessToken: string): Promise<AuthUser> {
    const trimmedToken = accessToken.trim();
    if (!trimmedToken) {
      throw new Error("Authentication required");
    }

    try {
      return await getAppSessionService().getUserFromAccessToken(trimmedToken);
    } catch (error) {
      if (getAppSessionService().looksLikeAppSessionToken(trimmedToken)) {
        throw error;
      }
    }

    const { supabaseUrl, supabasePublishableKey } = this.getSupabaseAuthConfig();
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${trimmedToken}`,
        apikey: supabasePublishableKey,
      },
    });

    if (!userResponse.ok) {
      throw new Error("Invalid or expired access token");
    }

    const userData = await userResponse.json() as { id?: string; email?: string | null };
    const user = this.mapUser(userData.id ? { id: userData.id, email: userData.email ?? null } : null);

    if (!user) {
      throw new Error("Invalid access token user data");
    }

    return user;
  }

  async updatePasswordWithRecoveryToken(accessToken: string, password: string): Promise<void> {
    const user = await this.getUserByAccessToken(accessToken);

    const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
    if (error) throw new Error(`Failed to update password: ${error.message}`);
  }
}

export const authService = AuthService.getInstance();
