import type { ReportOrganization } from "@/lib/reportOrganizations";

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL) ||
  "http://localhost:3001/api";

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

export class AuthClient {
  private static instance: AuthClient;

  private constructor() {}

  static getInstance(): AuthClient {
    if (!AuthClient.instance) {
      AuthClient.instance = new AuthClient();
    }
    return AuthClient.instance;
  }

  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;

    try {
      const rawSession = window.localStorage.getItem("meatlens-auth-session");
      if (!rawSession) return null;

      const parsedSession = JSON.parse(rawSession) as { access_token?: string | null };
      return parsedSession.access_token ?? null;
    } catch {
      return null;
    }
  }

  private createHeaders(initialHeaders?: HeadersInit): Headers {
    const headers = new Headers(initialHeaders);
    const accessToken = this.getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return headers;
  }

  async signIn(email: string, password: string): Promise<{ user: AuthUser; session: AuthSession | null }> {
    const res = await fetch(`${API_BASE_URL}/auth/sign-in`, {
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

  async signUp(payload: {
    email: string;
    password: string;
    fullName?: string;
    accessCode: string;
    reportOrganization: ReportOrganization;
    emailRedirectTo?: string;
  }): Promise<{ user: AuthUser | null; session: AuthSession | null }> {
    const res = await fetch(`${API_BASE_URL}/auth/sign-up`, {
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

  async signOut(): Promise<void> {
    await fetch(`${API_BASE_URL}/auth/sign-out`, {
      method: "POST",
      headers: this.createHeaders(),
    });
  }

  async resetPassword(email: string, redirectTo?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
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
    const res = await fetch(`${API_BASE_URL}/auth/users/${userId}/email`, {
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

  async updatePassword(userId: string, password: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/auth/users/${userId}/password`, {
      method: "PATCH",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Failed to update password" }));
      throw new Error(data.error || "Failed to update password");
    }
  }

  async updatePasswordWithRecoveryToken(accessToken: string, password: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/auth/recovery/password`, {
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
