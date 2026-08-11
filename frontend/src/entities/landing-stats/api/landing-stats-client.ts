import {
  IS_DEMO_MODE,
  demoDelay,
  DEMO_LANDING_STATS,
  type LandingPageStats,
} from "@/shared/config/demo-mode";
import { API_BASE_URL } from "@/shared/api/base-url";
import { fetchWithTimeout } from "@/shared/api";

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
