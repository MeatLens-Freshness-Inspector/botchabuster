import React from "react";
import { InspectionDisputeReviewSection } from "@/features/developer-tools";
import { useInspectionDisputeReviewQueue } from "@/features/inspection-disputes/model/use-inspection-dispute-review-queue";
import type { AdminDashboardPageViewModel } from "../model/use-admin-dashboard";
import { DisputeStatistics } from "./dispute-statistics";

type DisputesTabProps = {
  dashboard: Pick<AdminDashboardPageViewModel, "disputeAnalytics" | "isDeveloper">;
};

export default function DisputesTab({ dashboard }: DisputesTabProps) {
  const reviewQueue = useInspectionDisputeReviewQueue();

  return (
    <div className="mt-6 space-y-8">
      <section className="space-y-4" aria-labelledby="disputes-statistics">
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

      <section aria-labelledby="disputes-handling">
        <h2 id="disputes-handling" className="sr-only">Dispute handling</h2>
        <InspectionDisputeReviewSection
          disputes={reviewQueue.disputes}
          isLoading={reviewQueue.isLoading}
          canApplyDeveloperLabel={dashboard.isDeveloper}
          onApplyDeveloperLabel={reviewQueue.applyDeveloperLabel}
          onReview={reviewQueue.reviewDispute}
        />
      </section>
    </div>
  );
}
