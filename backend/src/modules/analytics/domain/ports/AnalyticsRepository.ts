export interface LandingPageStats {
  inspectionCount: number;
  userCount: number;
  freshRate: number;
}

export interface ClassificationStat {
  classification: string;
  total: number;
}

export interface AnalyticsRepository {
  getLandingPageStats(): Promise<LandingPageStats>;
  getClassificationStats(userId: string, includeAll: boolean): Promise<ClassificationStat[]>;
}
