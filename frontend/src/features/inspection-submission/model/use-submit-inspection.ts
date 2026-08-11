import { useMutation, useQueryClient } from "@tanstack/react-query";

import { inspectionClient, inspectionKeys, type InspectionInsert } from "@/entities/inspection";

export function useSubmitInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InspectionInsert) => inspectionClient.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
      void queryClient.invalidateQueries({ queryKey: inspectionKeys.statsPrefix });
    },
  });
}
