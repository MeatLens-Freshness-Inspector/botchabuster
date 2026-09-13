import React from "react";
import type { AdminDashboardPageViewModel } from "../model/use-admin-dashboard";
import { DisputeCharts } from "./dispute-charts";
import { DisputeHistoryTable } from "./dispute-history-table";
import { DisputeStatistics } from "./dispute-statistics";

type ReportsDisputesSectionProps = {
  dashboard: AdminDashboardPageViewModel;
};

export function ReportsDisputesSection({ dashboard }: ReportsDisputesSectionProps) {
  const { reportDateRangeInvalid, reportDisputeAnalytics } = dashboard;

  if (!reportDisputeAnalytics) return null;

  if (reportDateRangeInvalid) {
    return (
      <section className="mt-6 space-y-4" aria-labelledby="report-dispute-statistics">
        <div>
          <h2 id="report-dispute-statistics" className="font-display text-lg font-semibold uppercase tracking-wider">
            Dispute report
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a valid date range to view dispute statistics.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 space-y-4" aria-labelledby="report-dispute-statistics">
      <div>
        <h2 id="report-dispute-statistics" className="font-display text-lg font-semibold uppercase tracking-wider">
          Dispute reporting
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Disputes created within the selected report range.
        </p>
      </div>
      <DisputeStatistics
        summary={reportDisputeAnalytics.summary}
        title="Dispute report"
        description="Disputes created within the selected report range."
      />
      <DisputeCharts
        statusDistribution={reportDisputeAnalytics.statusDistribution}
        dailyTrend={reportDisputeAnalytics.dailyTrend}
      />
      <DisputeHistoryTable disputes={reportDisputeAnalytics.filteredDisputes} />
    </section>
  );
}
