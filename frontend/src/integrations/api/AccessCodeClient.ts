const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
const SESSION_STORAGE_KEY = "meatlens-auth-session";

export interface AccessCode {
  id: string;
  code: string;
  description: string | null;
  is_active: boolean;
  times_used: number;
  created_at: string;
}

export class AccessCodeClient {
  private static instance: AccessCodeClient;

  private constructor() {}

  static getInstance(): AccessCodeClient {
    if (!AccessCodeClient.instance) {
      AccessCodeClient.instance = new AccessCodeClient();
    }
    return AccessCodeClient.instance;
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

  async getAll(): Promise<AccessCode[]> {
    const res = await fetch(`${API_BASE_URL}/access-codes`, {
      headers: this.createHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch access codes: ${res.statusText}`);
    return res.json();
  }

  async validate(code: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/access-codes/validate`, {
      method: "POST",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ code }),
    });
    if (!res.ok) throw new Error(`Failed to validate access code: ${res.statusText}`);
    const data = await res.json() as { valid: boolean };
    return data.valid;
  }

  async create(code: string, description?: string): Promise<AccessCode> {
    const res = await fetch(`${API_BASE_URL}/access-codes`, {
      method: "POST",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ code, description }),
    });
    if (!res.ok) throw new Error(`Failed to create access code: ${res.statusText}`);
    return res.json();
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/access-codes/${id}`, {
      method: "DELETE",
      headers: this.createHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to delete access code: ${res.statusText}`);
  }

  async toggleActive(id: string, isActive: boolean): Promise<AccessCode> {
    const res = await fetch(`${API_BASE_URL}/access-codes/${id}/toggle`, {
      method: "PATCH",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ is_active: isActive }),
    });
    if (!res.ok) throw new Error(`Failed to toggle access code: ${res.statusText}`);
    return res.json();
  }
}

export const accessCodeClient = AccessCodeClient.getInstance();
