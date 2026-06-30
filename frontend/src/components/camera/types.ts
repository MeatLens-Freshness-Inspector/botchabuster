import type { SquareGuideBox } from "../../lib/offlineAnalysis/meatLensPipeline";

export interface CapturedImagePayload {
  file: File;
  guideBox?: SquareGuideBox | null;
  source: "camera" | "file";
  capturedAt: string;
}

export interface CameraCaptureProps {
  onCapture: (payload: CapturedImagePayload) => void;
  className?: string;
  disabled?: boolean;
  allowFileUpload?: boolean;
  allowInAppCamera?: boolean;
  showModelInputPreview?: boolean;
}

export type CaptureQualitySource = "canvas" | "file" | "cameraApp";
