import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  developerDashboardClient,
  type DeveloperDisputeMutationResponse,
} from "@/entities/developer-metrics";
import type { InspectionResultDispute } from "@/entities/inspection";

export function useInspectionDisputeReviewQueue() {
  const [disputes, setDisputes] = useState<InspectionResultDispute[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadDisputes = useCallback(async () => {
    setIsLoading(true);
    try {
      setDisputes(await developerDashboardClient.listInspectionResultDisputes());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load inspection disputes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeDispute = useCallback((disputeId: string) => {
    setDisputes((current) => current.filter((item) => item.id !== disputeId));
  }, []);

  const applyDeveloperLabel = useCallback(async (disputeId: string): Promise<DeveloperDisputeMutationResponse> => {
    try {
      const result = await developerDashboardClient.applyInspectionDisputeToDeveloperDataset(disputeId);
      setDisputes((current) => current.map((item) => (
        item.id === disputeId
          ? {
              ...item,
              developer_label_applied_at: result.dispute.developer_label_applied_at,
              developer_label_applied_by: result.dispute.developer_label_applied_by,
            }
          : item
      )));
      toast.success("Developer dataset label applied");
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply developer label");
      throw error;
    }
  }, []);

  const reviewDispute = useCallback(async (
    disputeId: string,
    decision: "approved" | "rejected",
    reviewerNote: string | null,
  ): Promise<DeveloperDisputeMutationResponse> => {
    try {
      const result = await developerDashboardClient.reviewInspectionResultDispute(disputeId, decision, reviewerNote);
      removeDispute(disputeId);
      toast.success(`Dispute ${decision}`);
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${decision} dispute`);
      throw error;
    }
  }, [removeDispute]);

  useEffect(() => {
    void loadDisputes();
  }, [loadDisputes]);

  return {
    disputes,
    isLoading,
    loadDisputes,
    applyDeveloperLabel,
    reviewDispute,
  };
}
