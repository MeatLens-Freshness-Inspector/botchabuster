import { IS_DEMO_MODE, demoDelay } from "@/shared/config/demo-mode";
import { fetchWithTimeout } from "@/shared/api";
import { API_BASE_URL } from "@/shared/api/base-url";
import { createAuthHeaders } from "@/shared/api/auth-headers";
import { notifyApiAuthExpired } from "@/shared/api/request";
import type { ModelAccuracySnapshot } from "../model/types";

function isFiniteUnitValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isSnapshot(value: unknown): value is ModelAccuracySnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<ModelAccuracySnapshot>;
  return (
    typeof snapshot.id === "string" &&
    typeof snapshot.modelVersionId === "string" &&
    typeof snapshot.versionKey === "string" &&
    typeof snapshot.displayName === "string" &&
    isDate(snapshot.snapshotDate) &&
    isFiniteUnitValue(snapshot.expectedAccuracy) &&
    (snapshot.observedAccuracy === null || isFiniteUnitValue(snapshot.observedAccuracy)) &&
    Number.isInteger(snapshot.evaluatedCount) &&
    typeof snapshot.evaluatedCount === "number" &&
    snapshot.evaluatedCount >= 0 &&
    Number.isInteger(snapshot.correctCount) &&
    typeof snapshot.correctCount === "number" &&
    snapshot.correctCount >= 0 &&
    snapshot.correctCount <= snapshot.evaluatedCount &&
    typeof snapshot.createdAt === "string"
  );
}

export class ModelAccuracyClient {
  private static instance: ModelAccuracyClient;

  private constructor() {}

  static getInstance(): ModelAccuracyClient {
    if (!ModelAccuracyClient.instance) {
      ModelAccuracyClient.instance = new ModelAccuracyClient();
    }
    return ModelAccuracyClient.instance;
  }

  async getHistory(startDate: string, endDate: string): Promise<ModelAccuracySnapshot[]> {
    if (IS_DEMO_MODE) return demoDelay([]);

    const params = new URLSearchParams({ startDate, endDate });
    const response = await fetchWithTimeout(`${API_BASE_URL}/model-accuracy/history?${params.toString()}`, {
      headers: createAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) notifyApiAuthExpired();
      let message = response.statusText || `HTTP ${response.status}`;
      try {
        const payload = await response.json() as { error?: unknown };
        if (typeof payload.error === "string" && payload.error.trim()) message = payload.error.trim();
      } catch {
        // Use the response status when the API does not return JSON.
      }
      throw new Error(`Failed to fetch model accuracy history: ${message}`);
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload) || !payload.every(isSnapshot)) {
      throw new Error("Invalid snapshot response");
    }

    return payload;
  }
}

export const modelAccuracyClient = ModelAccuracyClient.getInstance();
