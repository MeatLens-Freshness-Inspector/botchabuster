import type { AnalyticsRepository, LandingPageStats } from "../domain/ports/AnalyticsRepository";

export class GetLandingPageStats {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  execute(): Promise<LandingPageStats> {
    return this.analyticsRepository.getLandingPageStats();
  }
}
