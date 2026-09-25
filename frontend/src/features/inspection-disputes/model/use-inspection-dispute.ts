import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { FreshnessClassification } from "@/entities/inspection";
import { useSubmitInspectionDispute } from "./use-inspection-disputes";

export function useInspectionDispute() {
  const [savedInspectionId, setSavedInspectionIdState] = useState<string | null>(null);
  const [isDisputeSubmitted, setIsDisputeSubmitted] = useState(false);
  const requestGenerationRef = useRef(0);
  const submitDispute = useSubmitInspectionDispute();

  const setSavedInspectionId = useCallback((inspectionId: string) => {
    requestGenerationRef.current += 1;
    setSavedInspectionIdState(inspectionId);
    setIsDisputeSubmitted(false);
  }, []);

  const reset = useCallback(() => {
    requestGenerationRef.current += 1;
    setSavedInspectionIdState(null);
    setIsDisputeSubmitted(false);
  }, []);

  const onSubmit = useCallback(async (input: {
    expectedClassification: FreshnessClassification;
    reason: string;
  }) => {
    if (!savedInspectionId) return;
    const requestGeneration = requestGenerationRef.current;
    const inspectionId = savedInspectionId;

    try {
      await submitDispute.mutateAsync({
        inspectionId,
        expectedClassification: input.expectedClassification,
        reason: input.reason,
      });
      if (requestGenerationRef.current !== requestGeneration) return;
      setIsDisputeSubmitted(true);
      toast.success("Dispute submitted for review");
    } catch (error) {
      if (requestGenerationRef.current !== requestGeneration) return;
      toast.error(error instanceof Error ? error.message : "Failed to submit dispute");
    }
  }, [savedInspectionId, submitDispute]);

  return {
    savedInspectionId,
    isSubmitDisputePending: submitDispute.isPending,
    isDisputeSubmitted,
    setSavedInspectionId,
    reset,
    onSubmit,
  };
}
