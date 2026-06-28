import type { ReportOrganization } from "@/lib/reportOrganizations";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
const SESSION_STORAGE_KEY = "meatlens-auth-session";

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json() as { error?: unknown; message?: unknown };
    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }
    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }
  } catch {
    // Ignore JSON parse errors and fall through.
  }

  if (response.statusText && response.statusText.trim().length > 0) {
    return `${fallback}: ${response.statusText}`;
  }

  return fallback;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  inspector_code: string | null;
  report_organization: ReportOrganization | null;
  is_dark_mode: boolean | null;
  show_detailed_results: boolean | null;
  onboarding_completed_at: string | null;
  onboarding_version: number;
  email?: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

type ProfileUpdateInput = Partial<
  Pick<
    Profile,
    "full_name" | "avatar_url" | "location" | "is_dark_mode" | "show_detailed_results" | "onboarding_completed_at"
  >
>;

export interface AdminCreateUserPayload {
  email: string;
  password: string;
  full_name?: string | null;
  inspector_code?: string | null;
  report_organization?: ReportOrganization | null;
  location?: string | null;
  avatar_url?: string | null;
}

export interface AdminUpdateUserPayload {
  email?: string;
  password?: string;
  full_name?: string | null;
  inspector_code?: string | null;
  report_organization?: ReportOrganization | null;
  location?: string | null;
  avatar_url?: string | null;
}

export class ProfileClient {
  private static instance: ProfileClient;

  private constructor() {}

  static getInstance(): ProfileClient {
    if (!ProfileClient.instance) {
      ProfileClient.instance = new ProfileClient();
    }
    return ProfileClient.instance;
  }

  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;

    try {
      const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
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

  async getProfile(userId: string): Promise<Profile | null> {
    const res = await fetch(`${API_BASE_URL}/profiles/${userId}`, {
      headers: this.createHeaders(),
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(await readApiError(res, "Failed to fetch profile"));
    }
    return res.json();
  }

  async updateProfile(userId: string, updates: ProfileUpdateInput): Promise<Profile> {
    const res = await fetch(`${API_BASE_URL}/profiles/${userId}`, {
      method: "PUT",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to update profile"));
    return res.json();
  }

  async getAllProfiles(): Promise<Profile[]> {
    const res = await fetch(`${API_BASE_URL}/profiles`, {
      headers: this.createHeaders(),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to fetch profiles"));
    return res.json();
  }

  async createUserByAdmin(payload: AdminCreateUserPayload): Promise<Profile> {
    const res = await fetch(`${API_BASE_URL}/profiles/admin/users`, {
      method: "POST",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to create user"));
    return res.json();
  }

  async updateUserByAdmin(userId: string, payload: AdminUpdateUserPayload): Promise<Profile> {
    const res = await fetch(`${API_BASE_URL}/profiles/admin/users/${userId}`, {
      method: "PUT",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to update user"));
    return res.json();
  }

  async deleteUserByAdmin(userId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/profiles/admin/users/${userId}`, {
      method: "DELETE",
      headers: this.createHeaders(),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to delete user"));
  }

  async getUserStats(): Promise<{
    total_users: number;
    total_inspections: number;
    roles: { role: string; count: number }[] | null;
  }> {
    const res = await fetch(`${API_BASE_URL}/profiles/stats`, {
      headers: this.createHeaders(),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to fetch stats"));
    return res.json();
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/profiles/${userId}/has-role/${role}`, {
      headers: this.createHeaders(),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Failed to check user role"));
    const { hasRole } = await res.json();
    return hasRole;
  }
}

export const profileClient = ProfileClient.getInstance();
