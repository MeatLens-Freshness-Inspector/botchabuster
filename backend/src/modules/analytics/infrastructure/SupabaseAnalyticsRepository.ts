import type {
  AnalyticsRepository,
  ClassificationStat,
  LandingPageStats,
} from "../domain/ports/AnalyticsRepository";

interface RpcResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface AnalyticsRpcClient {
  rpc<T = unknown>(functionName: string, args?: Record<string, unknown>): Promise<RpcResult<T>>;
}

function assertNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Analytics field ${fieldName} is invalid`);
  }

  return value;
}

export class SupabaseAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly client: AnalyticsRpcClient) {}

  async getLandingPageStats(): Promise<LandingPageStats> {
    const { data, error } = await this.client.rpc<Record<string, unknown>>("get_landing_page_stats");
    if (error) throw new Error(`Failed to fetch landing page stats: ${error.message}`);
    if (!data) throw new Error("Landing page stats response is missing");

    return {
      inspectionCount: assertNumber(data.inspectionCount, "inspectionCount"),
      userCount: assertNumber(data.userCount, "userCount"),
      freshRate: assertNumber(data.freshRate, "freshRate"),
    };
  }

  async getClassificationStats(userId: string, includeAll: boolean): Promise<ClassificationStat[]> {
    const { data, error } = await this.client.rpc<Array<Record<string, unknown>>>(
      "get_inspection_classification_stats",
      { _user_id: userId, _include_all: includeAll },
    );
    if (error) throw new Error(`Failed to fetch inspection classification stats: ${error.message}`);

    return (data ?? []).map((row) => ({
      classification: String(row.classification ?? ""),
      total: assertNumber(row.total, "total"),
    }));
  }
}
