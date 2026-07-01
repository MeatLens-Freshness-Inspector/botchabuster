import type { CapturedImagePayload } from "@/components/CameraCapture";
import type { InspectionPreScanForm } from "@/lib/inspectionPreScan";
import type { AnalysisResult, InspectionDecisionSource } from "@/types/inspection";

export type InspectionSaveStatus = "idle" | "saving" | "saved" | "queued";

export interface InspectPageViewModel {
  capturedInput: CapturedImagePayload | null;
  result: AnalysisResult | null;
  preScanForm: InspectionPreScanForm;
  marketLocations: string[];
  selectedLocation: string;
  locationDisplayLabel: string;
  coordinateStatusText: string | null;
  inspectionDecisionSource: InspectionDecisionSource | null;
  isAnalyzing: boolean;
  isAnalyzeBlockedByModel: boolean;
  isAnalyzeDisabled: boolean;
  isCaptureDisabled: boolean;
  isCreateInspectionPending: boolean;
  isDebugFileUploadEnabled: boolean;
  isInAppCameraEnabled: boolean;
  isPreScanBypassed: boolean;
  isPreScanChecklistComplete: boolean;
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
  onPreScanFieldChange: (field: keyof InspectionPreScanForm, value: string) => void;
  onSelectedLocationChange: (value: string) => void;
  onCapture: (capture: CapturedImagePayload) => void;
  onAnalyze: () => void;
  onReset: () => void;
  onSave: () => void;
}
