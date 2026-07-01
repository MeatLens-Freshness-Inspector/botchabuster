import type { Inspection, InspectionInsert } from "@/types/inspection";
import { IS_DEMO_MODE, demoDelay, DEMO_INSPECTIONS, DEMO_STATS } from "@/lib/demoMode";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
const SESSION_STORAGE_KEY = "meatlens-auth-session";
const USER_STORAGE_KEY = "meatlens-auth-user";
const AUTH_EXPIRED_EVENT = "meatlens:auth-expired";

export type InspectionScope = "mine" | "all";

export class InspectionClient {
  private static instance: InspectionClient;

  private constructor() {}

  static getInstance(): InspectionClient {
    if (!InspectionClient.instance) {
      InspectionClient.instance = new InspectionClient();
    }
    return InspectionClient.instance;
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

  private async readApiError(response: Response): Promise<string> {
    try {
      const payload = await response.json() as { error?: unknown; message?: unknown };
      if (typeof payload.error === "string" && payload.error.trim().length > 0) {
        return payload.error.trim();
      }
      if (typeof payload.message === "string" && payload.message.trim().length > 0) {
        return payload.message.trim();
      }
    } catch {
      // Ignore JSON parse errors and fall through to generic details.
    }

    if (response.statusText && response.statusText.trim().length > 0) {
      return response.statusText.trim();
    }

    return `HTTP ${response.status}`;
  }

  private notifyAuthExpired(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(USER_STORAGE_KEY);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }

  private async createRequestError(action: string, response: Response): Promise<Error> {
    if (response.status === 401) {
      this.notifyAuthExpired();
      return new Error("Session expired. Please sign in again.");
    }

    const details = await this.readApiError(response);
    return new Error(`Failed to ${action}: ${details}`);
  }

  async getAll(limit = 50, offset = 0, scope: InspectionScope = "mine"): Promise<Inspection[]> {
    if (IS_DEMO_MODE) return demoDelay(DEMO_INSPECTIONS.slice(offset, offset + limit));
    const res = await fetch(`${API_BASE_URL}/inspections?limit=${limit}&offset=${offset}&scope=${scope}`, {
      headers: this.createHeaders(),
    });
    if (!res.ok) throw await this.createRequestError("fetch inspections", res);
    return res.json();
  }

  async getById(id: string, scope: InspectionScope = "mine"): Promise<Inspection | null> {
    if (IS_DEMO_MODE) return demoDelay(DEMO_INSPECTIONS.find((i) => i.id === id) ?? null);
    const res = await fetch(`${API_BASE_URL}/inspections/${id}?scope=${scope}`, {
      headers: this.createHeaders(),
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw await this.createRequestError("fetch inspection", res);
    }
    return res.json();
  }

  async create(inspection: InspectionInsert): Promise<Inspection> {
    if (IS_DEMO_MODE) {
      const newItem: Inspection = {
        id: `demo-insp-${Date.now()}`,
        user_id: "demo-user-001",
        flagged_deviations: inspection.flagged_deviations ?? [],
        explanation: inspection.explanation ?? null,
        image_url: inspection.image_url ?? null,
        location: inspection.location ?? null,
        location_latitude: inspection.location_latitude ?? null,
        location_longitude: inspection.location_longitude ?? null,
        stall_number: inspection.stall_number ?? null,
        meat_inspection_certificate_proof:
          inspection.meat_inspection_certificate_proof ?? null,
        meat_expiry_date: inspection.meat_expiry_date ?? null,
        storage_correct: inspection.storage_correct ?? null,
        light_color_correct: inspection.light_color_correct ?? null,
        light_color_observed: inspection.light_color_observed ?? null,
        area_clean: inspection.area_clean ?? null,
        inspection_decision_source: inspection.inspection_decision_source ?? null,
        protocol_spoiled_reason: inspection.protocol_spoiled_reason ?? null,
        inspector_notes: inspection.inspector_notes ?? null,
        captured_at: inspection.captured_at ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        meat_type: inspection.meat_type,
        classification: inspection.classification,
        confidence_score: inspection.confidence_score,
      };
      DEMO_INSPECTIONS.unshift(newItem);
      return demoDelay(newItem);
    }
    const res = await fetch(`${API_BASE_URL}/inspections`, {
      method: "POST",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(inspection),
    });
    if (!res.ok) throw await this.createRequestError("create inspection", res);
    return res.json();
  }

  async delete(id: string): Promise<void> {
    if (IS_DEMO_MODE) {
      const idx = DEMO_INSPECTIONS.findIndex((i) => i.id === id);
      if (idx !== -1) DEMO_INSPECTIONS.splice(idx, 1);
      return demoDelay(undefined);
    }
    const res = await fetch(`${API_BASE_URL}/inspections/${id}`, {
      method: "DELETE",
      headers: this.createHeaders(),
    });
    if (!res.ok) throw await this.createRequestError("delete inspection", res);
  }

  async getStatistics(scope: InspectionScope = "mine"): Promise<{
    total: number;
    byClassification: Record<string, number>;
  }> {
    if (IS_DEMO_MODE) return demoDelay({ ...DEMO_STATS, byClassification: { ...DEMO_STATS.byClassification } });
    const res = await fetch(`${API_BASE_URL}/inspections/stats?scope=${scope}`, {
      headers: this.createHeaders(),
    });
    if (!res.ok) throw await this.createRequestError("fetch inspection statistics", res);
    return res.json();
  }
}

export const inspectionClient = InspectionClient.getInstance();
