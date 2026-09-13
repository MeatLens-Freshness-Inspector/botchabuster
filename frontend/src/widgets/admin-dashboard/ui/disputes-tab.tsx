import React from "react";
import type { AdminDashboardPageViewModel } from "../model/use-admin-dashboard";
import { DisputeStatistics } from "./dispute-statistics";

type DisputesTabProps = {
  dashboard: Pick<AdminDashboardPageViewModel, "disputeAnalytics">;
};

export default function DisputesTab({ dashboard }: DisputesTabProps) {
  return (
    <section className="mt-6 space-y-4" aria-labelledby="disputes-statistics">
      <div>
        <h2 id="disputes-statistics" className="font-display text-lg font-semibold uppercase tracking-wider">
          Dispute statistics
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Current dispute totals across all submitted inspection results.
        </p>
      </div>
      <DisputeStatistics summary={dashboard.disputeAnalytics.summary} />
    </section>
  );
}
