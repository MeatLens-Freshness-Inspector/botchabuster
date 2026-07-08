import { IS_DEMO_MODE, demoDelay, DEMO_LANDING_STATS } from "@/lib/demoMode";
import { fetchWithTimeout } from "./fetchWithTimeout";

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL) ||
  "http://localhost:3001/api";

export interface LandingPageStats {
  inspectionCount: number;
  userCount: number;
  freshRate: number;
}

export class StatsClient {
  private static instance: StatsClient;

  private constructor() {}

  static getInstance(): StatsClient {
    if (!StatsClient.instance) {
      StatsClient.instance = new StatsClient();
    }
    return StatsClient.instance;
  }

  async getLandingPageStats(): Promise<LandingPageStats> {
    if (IS_DEMO_MODE) return demoDelay({ ...DEMO_LANDING_STATS });
    const res = await fetchWithTimeout(`${API_BASE_URL}/stats/landing-page`);
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
    return res.json();
  }
}

export const statsClient = StatsClient.getInstance();
