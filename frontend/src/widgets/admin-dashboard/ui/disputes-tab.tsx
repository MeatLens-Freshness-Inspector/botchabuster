import { InspectionDisputeReviewSection } from "@/features/developer-tools";
import { useInspectionDisputeReviewQueue } from "@/features/inspection-disputes/model/use-inspection-dispute-review-queue";
import { useAuth } from "@/entities/user";

export default function DisputesTab() {
  const reviewQueue = useInspectionDisputeReviewQueue();
  const { isDeveloper } = useAuth();

  return (
    <InspectionDisputeReviewSection
      disputes={reviewQueue.disputes}
      isLoading={reviewQueue.isLoading}
      canApplyDeveloperLabel={isDeveloper}
      onApplyDeveloperLabel={reviewQueue.applyDeveloperLabel}
      onReview={reviewQueue.reviewDispute}
    />
  );
}
