import type { AnalyticsRepository } from "../domain/ports/AnalyticsRepository";

export interface GetInspectionStatisticsInput {
  userId: string;
  includeAll: boolean;
}

export interface InspectionStatistics {
  total: number;
  byClassification: Record<string, number>;
}

export class GetInspectionStatistics {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async execute(input: GetInspectionStatisticsInput): Promise<InspectionStatistics> {
    const rows = await this.analyticsRepository.getClassificationStats(input.userId, input.includeAll);
    const byClassification: Record<string, number> = {};

    for (const row of rows) {
      byClassification[row.classification] = row.total;
    }

    return {
      total: rows.reduce((total, row) => total + row.total, 0),
      byClassification,
    };
  }
}
