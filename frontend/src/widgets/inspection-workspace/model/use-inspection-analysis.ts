import type { AnalysisResult, InspectionDecisionSource } from "@/entities/inspection";

export interface InspectionAnalysisStateOptions {
  isModelReady: boolean;
  isAnalyzing: boolean;
  result: AnalysisResult | null;
  inspectionDecisionSource: InspectionDecisionSource | null;
  online: boolean;
}

export interface InspectionAnalysisState {
  isAnalyzeBlockedByModel: boolean;
  analysisStatusText: string;
}

export function deriveInspectionAnalysisState({
  isModelReady,
  isAnalyzing,
  result,
  inspectionDecisionSource,
  online,
}: InspectionAnalysisStateOptions): InspectionAnalysisState {
  if (inspectionDecisionSource === "protocol_pre_scan" && result) {
    return {
      isAnalyzeBlockedByModel: online && !isModelReady,
      analysisStatusText: "Protocol Result",
    };
  }

  return {
    isAnalyzeBlockedByModel: online && !isModelReady,
    analysisStatusText: isAnalyzing ? "Running" : result ? result.classification : "Pending",
  };
}

export function useInspectionAnalysis(
  options: InspectionAnalysisStateOptions,
): InspectionAnalysisState {
  return deriveInspectionAnalysisState(options);
}
