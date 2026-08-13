import type { ChangeEventHandler, RefObject } from "react";

import type { ImageQualityResult } from "../lib/image-quality";
import type { SquareGuideBox } from "@/features/offline-analysis";

import type { CameraControlKey, CameraControlsState } from "../lib/controls";

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
  disableRoiSegmentation?: boolean;
}

export type CaptureQualitySource = "canvas" | "file" | "cameraApp";

export interface CameraCaptureViewProps {
  className?: string;
  disabled: boolean;
  allowFileUpload: boolean;
  allowInAppCamera: boolean;
  showModelInputPreview: boolean;
  capturedImage: string | null;
  capturedImageRef: RefObject<HTMLImageElement | null>;
  onCapturedImageLoad: () => void;
  isStreaming: boolean;
  isVideoReady: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  error: string | null;
  modelInputLabel: string;
  modelInputPreview: string | null;
  isPreparingModelPreview: boolean;
  torchSupported: boolean;
  flashEnabled: boolean;
  cameraControls: CameraControlsState;
  supportsManualFocusMode: boolean;
  showManualFocusSlider: boolean;
  hasManualControlSupport: boolean;
  captureQualityResult: ImageQualityResult | null;
  isStarting: boolean;
  onTorchToggle: () => void;
  onFocusModeChange: (nextMode: string) => void;
  onRangeControlChange: (controlKey: CameraControlKey, value: string) => void;
  onRetake: () => void;
  onConfirmCapture: () => void;
  onCapturePhoto: () => void;
  onStartCamera: () => void;
  onFileInput: ChangeEventHandler<HTMLInputElement>;
  onCameraAppInput: ChangeEventHandler<HTMLInputElement>;
}
