import React from "react";
import type { AdminDashboardPageViewModel } from "../../model/use-admin-dashboard";
import { DisputeStatistics } from "../dispute-statistics";
import { DisputeCharts } from "../dispute-charts";

export function DisputeOverview({ dashboard }: { dashboard: AdminDashboardPageViewModel }) {
  return (
    <section aria-labelledby="overview-dispute-statistics" className="space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Dispute activity</p>
        <h2 id="overview-dispute-statistics" className="mt-2 font-display text-2xl font-semibold tracking-tight">Inspection result disputes</h2>
        <p className="mt-2 text-sm text-muted-foreground">Review the full resolution mix and recent dispute activity.</p>
      </div>
      <DisputeStatistics summary={dashboard.disputeAnalytics.summary} />
      <DisputeCharts
        statusDistribution={dashboard.disputeAnalytics.statusDistribution}
        dailyTrend={dashboard.disputeAnalytics.dailyTrend}
      />
    </section>
  );
}
