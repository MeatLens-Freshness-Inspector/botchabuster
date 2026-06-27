import type { CapturedImagePayload } from "@/components/CameraCapture";
import type { AnalysisResult } from "@/types/inspection";

export type InspectionSaveStatus = "idle" | "saving" | "saved" | "queued";

export interface InspectPageViewModel {
  capturedInput: CapturedImagePayload | null;
  result: AnalysisResult | null;
  marketLocations: string[];
  selectedLocation: string;
  isAnalyzing: boolean;
  isAnalyzeBlockedByModel: boolean;
  isAnalyzeDisabled: boolean;
  isCaptureDisabled: boolean;
  isCreateInspectionPending: boolean;
  isDebugFileUploadEnabled: boolean;
  isLocationSelectionDisabled: boolean;
  saveStatus: InspectionSaveStatus;
  showDetailedResults: boolean;
  showModelInputPreview: boolean;
  showAnalyzeAction: boolean;
  showSaveActions: boolean;
  captureStatusText: string;
  analysisStatusText: string;
  confidenceText: string;
  confidenceSummaryClass: string;
  saveButtonLabel: string;
  onSelectedLocationChange: (value: string) => void;
  onCapture: (capture: CapturedImagePayload) => void;
  onAnalyze: () => void;
  onReset: () => void;
  onSave: () => void;
}
