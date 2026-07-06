import { createAuthHeaders } from "@/lib/authCache";
import { fetchWithTimeout } from "./fetchWithTimeout";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

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

export interface DeveloperUnlockResponse {
  token: string;
  expires_at: string;
}

export class DeveloperOptionsClient {
  private static instance: DeveloperOptionsClient;

  private constructor() {}

  static getInstance(): DeveloperOptionsClient {
    if (!DeveloperOptionsClient.instance) {
      DeveloperOptionsClient.instance = new DeveloperOptionsClient();
    }
    return DeveloperOptionsClient.instance;
  }

  private createHeaders(initialHeaders?: HeadersInit): Headers {
    return createAuthHeaders(initialHeaders);
  }

  async unlock(password: string): Promise<DeveloperUnlockResponse> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/developer-options/unlock`, {
      method: "POST",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Failed to unlock developer options"));
    }

    return response.json() as Promise<DeveloperUnlockResponse>;
  }

  async verify(token: string): Promise<boolean> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/developer-options/verify`, {
      method: "POST",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json().catch(() => ({ valid: false }));
    return Boolean(payload.valid);
  }
}

export const developerOptionsClient = DeveloperOptionsClient.getInstance();
