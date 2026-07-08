import { createAuthHeaders } from "@/lib/authCache";
import { fetchWithTimeout } from "./fetchWithTimeout";

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL) ||
  "http://localhost:3001/api";

export interface MarketLocation {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export class MarketLocationClient {
  private static instance: MarketLocationClient;

  private constructor() {}

  static getInstance(): MarketLocationClient {
    if (!MarketLocationClient.instance) {
      MarketLocationClient.instance = new MarketLocationClient();
    }
    return MarketLocationClient.instance;
  }

  private createHeaders(initialHeaders?: HeadersInit): Headers {
    return createAuthHeaders(initialHeaders);
  }

  private createRequestError(action: string, response: Response): Error {
    if (response.status === 404) {
      return new Error(
        "Market location API is unavailable on the current backend deployment. Deploy the latest backend service.",
      );
    }

    return new Error(`Failed to ${action}: ${response.statusText}`);
  }

  async getAll(): Promise<MarketLocation[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/market-locations`, {
      headers: this.createHeaders(),
    });
    if (!res.ok) {
      if (res.status === 404) {
        console.warn("Market location API route missing in backend deployment; falling back to an empty list.");
        return [];
      }

      throw this.createRequestError("fetch market locations", res);
    }

    return res.json();
  }

  async create(name: string): Promise<MarketLocation> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/market-locations`, {
      method: "POST",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw this.createRequestError("create market location", res);
    return res.json();
  }

  async delete(id: string): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/market-locations/${id}`, {
      method: "DELETE",
      headers: this.createHeaders(),
    });
    if (!res.ok) throw this.createRequestError("delete market location", res);
  }
}

export const marketLocationClient = MarketLocationClient.getInstance();
