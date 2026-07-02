import { fetchWithTimeout } from "./fetchWithTimeout";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
const SESSION_STORAGE_KEY = "meatlens-auth-session";
const USER_STORAGE_KEY = "meatlens-auth-user";
const AUTH_EXPIRED_EVENT = "meatlens:auth-expired";

export type AuditLogEvent = {
  client_event_id: string;
  event_type: string;
  event_time: string;
  data?: Record<string, unknown>;
  source?: Record<string, unknown>;
};

export type AuditLogEntry = {
  id: string;
  client_event_id: string;
  key_id: string;
  created_at: string;
  payload: Record<string, unknown>;
};

export class AuditLogClient {
  private static instance: AuditLogClient;

  private constructor() {}

  static getInstance(): AuditLogClient {
    if (!AuditLogClient.instance) {
      AuditLogClient.instance = new AuditLogClient();
    }
    return AuditLogClient.instance;
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

  private notifyAuthExpired(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(USER_STORAGE_KEY);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }

  async createBatch(events: AuditLogEvent[]): Promise<number> {
    if (events.length === 0) return 0;

    const res = await fetchWithTimeout(`${API_BASE_URL}/audit-logs`, {
      method: "POST",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ events }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.notifyAuthExpired();
      }
      const data = await res.json().catch(() => ({ error: "Failed to create audit logs" }));
      throw new Error(data.error || "Failed to create audit logs");
    }

    const payload = await res.json() as { accepted?: number };
    return payload.accepted ?? events.length;
  }

  async listRecent(limit = 100): Promise<AuditLogEntry[]> {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 500) : 100;

    const res = await fetchWithTimeout(`${API_BASE_URL}/audit-logs?limit=${safeLimit}`, {
      method: "GET",
      headers: this.createHeaders(),
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.notifyAuthExpired();
      }
      const data = await res.json().catch(() => ({ error: "Failed to fetch audit logs" }));
      throw new Error(data.error || "Failed to fetch audit logs");
    }

    const payload = await res.json() as { logs?: AuditLogEntry[] };
    return Array.isArray(payload.logs) ? payload.logs : [];
  }
}

export const auditLogClient = AuditLogClient.getInstance();
