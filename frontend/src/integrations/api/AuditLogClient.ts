import { clearCachedAuth, createAuthHeaders } from "@/lib/authCache";
import { fetchWithTimeout } from "./fetchWithTimeout";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
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

  private createHeaders(initialHeaders?: HeadersInit): Headers {
    return createAuthHeaders(initialHeaders);
  }

  private notifyAuthExpired(): void {
    if (typeof window === "undefined") return;
    clearCachedAuth();
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
