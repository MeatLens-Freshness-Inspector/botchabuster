import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/entities/user";
import { inspectionClient, inspectionKeys } from "@/entities/inspection";
import type { FreshnessClassification } from "@/entities/inspection";

export const inspectionDisputeKeys = {
  all: ["inspection-result-disputes"] as const,
};

export function useInspectionDisputes() {
  const { user, isOnlineAuthenticated } = useAuth();
  return useQuery({
    queryKey: [...inspectionDisputeKeys.all, user?.id ?? "anonymous"],
    queryFn: () => inspectionClient.listResultDisputes(),
    enabled: Boolean(user?.id && isOnlineAuthenticated),
  });
}

export function useSubmitInspectionDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      inspectionId,
      expectedClassification,
      reason,
    }: {
      inspectionId: string;
      expectedClassification: FreshnessClassification;
      reason: string;
    }) => inspectionClient.submitResultDispute(inspectionId, { expectedClassification, reason }),
    onSuccess: (dispute) => {
      queryClient.invalidateQueries({ queryKey: inspectionDisputeKeys.all });
      queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
      queryClient.invalidateQueries({ queryKey: ["inspection"] });
      return dispute;
    },
  });
}
