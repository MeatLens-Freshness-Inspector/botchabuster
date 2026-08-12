import type { ReportOrganization } from "@/entities/user/api/profile-client";
import { createAuthHeaders } from "@/shared/api/auth-headers";
import { createHttpApiError, fetchWithTimeout, readApiErrorMessage } from "@/shared/api";
import { API_BASE_URL } from "@/shared/api/base-url";
import type { Profile } from "@/entities/user/api/profile-client";
import type { AuthPrimaryRole, AuthRole, AuthSession, AuthUser } from "@/entities/user";

export type { AuthPrimaryRole, AuthRole, AuthSession, AuthUser } from "@/entities/user";

export interface AuthBootstrapPayload {
  user: AuthUser;
  profile: Profile;
  session: AuthSession;
  roles: AuthRole[];
  primaryRole: AuthPrimaryRole;
  isAdmin: boolean;
  isDeveloper: boolean;
  csrfToken: string;
  authenticatedAt: string;
  offlineExpiresAt: string;
}

export class AuthClient {
  private static instance: AuthClient;

  private constructor() {}

  static getInstance(): AuthClient {
    if (!AuthClient.instance) {
      AuthClient.instance = new AuthClient();
    }
    return AuthClient.instance;
  }

  private createHeaders(initialHeaders?: HeadersInit): Headers {
    return createAuthHeaders(initialHeaders);
  }

  async signIn(email: string, password: string): Promise<AuthBootstrapPayload> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Sign in failed" }));
      throw new Error(data.error || "Sign in failed");
    }

    return res.json();
  }

  async getSession(): Promise<AuthBootstrapPayload> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/session`, {
      method: "GET",
      headers: this.createHeaders(),
    });

    if (!res.ok) {
      throw createHttpApiError(
        await readApiErrorMessage(res, "Authentication required"),
        res.status,
      );
    }

    return res.json();
  }

  async signUp(payload: {
    email: string;
    password: string;
    fullName?: string;
    accessCode: string;
    reportOrganization: ReportOrganization;
    emailRedirectTo?: string;
  }): Promise<{ user: AuthUser | null; session: AuthSession | null }> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/sign-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Sign up failed" }));
      throw new Error(data.error || "Sign up failed");
    }

    return res.json();
  }

  async signOut(csrfToken?: string | null): Promise<void> {
    const headers = this.createHeaders();
    if (csrfToken?.trim()) {
      headers.set("X-CSRF-Token", csrfToken.trim());
    }

    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/sign-out`, {
      method: "POST",
      headers,
    });

    if (!res.ok) {
      throw createHttpApiError(
        await readApiErrorMessage(res, "Failed to sign out"),
        res.status,
      );
    }
  }

  async resetPassword(email: string, redirectTo?: string): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, redirectTo }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Failed to send password reset" }));
      throw new Error(data.error || "Failed to send password reset");
    }
  }

  async updateEmail(userId: string, email: string): Promise<AuthUser> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/users/${userId}/email`, {
      method: "PATCH",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Failed to update email" }));
      throw new Error(data.error || "Failed to update email");
    }

    return res.json();
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/users/${userId}/password`, {
      method: "PATCH",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Failed to update password" }));
      throw new Error(data.error || "Failed to update password");
    }
  }

  async updatePasswordWithRecoveryToken(accessToken: string, password: string): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/recovery/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Failed to update password" }));
      throw new Error(data.error || "Failed to update password");
    }
  }
}

export const authClient = AuthClient.getInstance();
