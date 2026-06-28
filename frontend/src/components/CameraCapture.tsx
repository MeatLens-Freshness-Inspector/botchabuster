import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, RotateCcw, Check, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { assessFileQuality } from "@/lib/captureQuality";
import {
  validateImageQuality,
  type ImageQualityResult,
} from "@/lib/imageQuality";
import {
  createModelInputImageFile,
  DEFAULT_MEATLENS_INPUT_SIZE,
  resolveCenteredObjectCoverGuideBox,
  type SquareGuideBox,
} from "@/lib/offlineAnalysis/meatLensPipeline";
import { getActiveModelPreprocessContract } from "@/lib/offlineAnalysis/mobileNetV3";

/**
 * Resolves an ImageQualityResult from a canvas.
 *
 * Test seam: if window.__mockImageQualityResult is set (test environments only),
 * that value is returned instead of running the real validation.
 */
function resolveCanvasImageQuality(canvas: HTMLCanvasElement): ImageQualityResult {
  const testSeam = (window as Window & { __mockImageQualityResult?: ImageQualityResult })
    .__mockImageQualityResult;
  if (testSeam !== undefined) {
    return testSeam;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      status: "pass",
      issues: [],
      metrics: { width: canvas.width, height: canvas.height },
      canProceed: true,
    };
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return validateImageQuality(imageData, canvas.width, canvas.height);
}

/**
 * Resolves an ImageQualityResult from a File via an OffscreenCanvas.
 *
 * Test seam: if window.__mockImageQualityResult is set (test environments only),
 * that value is returned instead of running the real validation.
 */
async function resolveFileImageQuality(file: File): Promise<ImageQualityResult | null> {
  const testSeam = (window as Window & { __mockImageQualityResult?: ImageQualityResult })
    .__mockImageQualityResult;
  if (testSeam !== undefined) {
    return testSeam;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const offscreen = new OffscreenCanvas(width, height);
    const ctx = offscreen.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const imageData = ctx.getImageData(0, 0, width, height);
    return validateImageQuality(imageData, width, height);
  } catch {
    return null;
  }
}

export interface CapturedImagePayload {
  file: File;
  guideBox?: SquareGuideBox | null;
  source: "camera" | "file";
  capturedAt: string;
}

const GUIDE_BOX_SIZE_RATIO = 0.72;
const PREVIEW_EXPORT_QUALITY = 0.92;

type CameraControlKey = "focusDistance" | "brightness" | "exposureCompensation" | "zoom" | "aperture";

interface CameraControlRange {
  min: number;
  max: number;
  step: number;
}

interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
  focusMode?: string[];
  focusDistance?: MediaSettingsRange;
  brightness?: MediaSettingsRange;
  exposureCompensation?: MediaSettingsRange;
  zoom?: MediaSettingsRange;
  aperture?: MediaSettingsRange;
}

interface ExtendedMediaTrackSettings extends MediaTrackSettings {
  torch?: boolean;
  focusMode?: string;
  focusDistance?: number;
  brightness?: number;
  exposureCompensation?: number;
  zoom?: number;
  aperture?: number;
}

interface AdvancedCameraConstraints extends MediaTrackConstraintSet {
  torch?: boolean;
  focusMode?: string;
  focusDistance?: number;
  brightness?: number;
  exposureCompensation?: number;
  zoom?: number;
  aperture?: number;
}

interface CameraControlsState {
  focusModeOptions: string[];
  focusMode: string | null;
  focusDistanceRange: CameraControlRange | null;
  focusDistance: number | null;
  brightnessRange: CameraControlRange | null;
  brightness: number | null;
  exposureCompensationRange: CameraControlRange | null;
  exposureCompensation: number | null;
  apertureRange: CameraControlRange | null;
  aperture: number | null;
  zoomRange: CameraControlRange | null;
  zoom: number | null;
}

const EMPTY_CAMERA_CONTROLS: CameraControlsState = {
  focusModeOptions: [],
  focusMode: null,
  focusDistanceRange: null,
  focusDistance: null,
  brightnessRange: null,
  brightness: null,
  exposureCompensationRange: null,
  exposureCompensation: null,
  apertureRange: null,
  aperture: null,
  zoomRange: null,
  zoom: null,
};

function parseCameraControlRange(value: unknown): CameraControlRange | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const maybeRange = value as { min?: unknown; max?: unknown; step?: unknown };
  if (typeof maybeRange.min !== "number" || typeof maybeRange.max !== "number") {
    return null;
  }

  if (!Number.isFinite(maybeRange.min) || !Number.isFinite(maybeRange.max) || maybeRange.max <= maybeRange.min) {
    return null;
  }

  const step =
    typeof maybeRange.step === "number" && Number.isFinite(maybeRange.step) && maybeRange.step > 0
      ? maybeRange.step
      : 0.1;

  return { min: maybeRange.min, max: maybeRange.max, step };
}

function clampToRange(value: number, range: CameraControlRange): number {
  return Math.min(range.max, Math.max(range.min, value));
}

function normalizeSettingNumber(value: unknown, range: CameraControlRange | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return range ? range.min : null;
  }

  if (!range) {
    return value;
  }

  return clampToRange(value, range);
}

function formatControlValue(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to render model-input preview."));
    reader.readAsDataURL(blob);
  });
}

interface CameraCaptureProps {
  onCapture: (payload: CapturedImagePayload) => void;
  className?: string;
  disabled?: boolean;
  allowFileUpload?: boolean;
  showModelInputPreview?: boolean;
}

export function CameraCapture({
  onCapture,
  className,
  disabled = false,
  allowFileUpload = false,
  showModelInputPreview = true,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const capturedImageRef = useRef<HTMLImageElement>(null);
  const previewRequestIdRef = useRef(0);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [qualitySource, setQualitySource] = useState<"canvas" | "file" | "cameraApp">("canvas");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [captureGuideBox, setCaptureGuideBox] = useState<SquareGuideBox | null>(null);
  const [modelInputPreview, setModelInputPreview] = useState<string | null>(null);
  const [isPreparingModelPreview, setIsPreparingModelPreview] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraControls, setCameraControls] = useState<CameraControlsState>(EMPTY_CAMERA_CONTROLS);
  const [captureQualityResult, setCaptureQualityResult] = useState<ImageQualityResult | null>(null);

  const updateModelInputPreview = useCallback(async (sourceFile: File, guideBox: SquareGuideBox | null) => {
    const requestId = ++previewRequestIdRef.current;
    setIsPreparingModelPreview(true);

    try {
      const preprocessContract = getActiveModelPreprocessContract();
      const requiresSegmentedCenterRoi = preprocessContract === "segmented_center_roi";
      const preparedInput = await createModelInputImageFile(sourceFile, {
        guideBox: requiresSegmentedCenterRoi ? null : guideBox,
        forceCenterCrop: requiresSegmentedCenterRoi,
        applySegmentation: requiresSegmentedCenterRoi,
        size: DEFAULT_MEATLENS_INPUT_SIZE,
        mimeType: "image/jpeg",
        quality: PREVIEW_EXPORT_QUALITY,
      });
      const previewDataUrl = await readBlobAsDataUrl(preparedInput.file);

      if (previewRequestIdRef.current === requestId) {
        setModelInputPreview(previewDataUrl);
      }
    } catch (previewError) {
      console.warn("[Capture] Failed to prepare 224x224 model preview:", previewError);
      if (previewRequestIdRef.current === requestId) {
        setModelInputPreview(null);
      }
    } finally {
      if (previewRequestIdRef.current === requestId) {
        setIsPreparingModelPreview(false);
      }
    }
  }, []);

  const resetCameraControls = useCallback(() => {
    videoTrackRef.current = null;
    setTorchSupported(false);
    setFlashEnabled(false);
    setCameraControls(EMPTY_CAMERA_CONTROLS);
  }, []);

  const initializeCameraControls = useCallback((track: MediaStreamTrack) => {
    const capabilities =
      typeof track.getCapabilities === "function"
        ? ((track.getCapabilities() as ExtendedMediaTrackCapabilities) ?? {})
        : ({} as ExtendedMediaTrackCapabilities);
    const settings =
      typeof track.getSettings === "function"
        ? ((track.getSettings() as ExtendedMediaTrackSettings) ?? {})
        : ({} as ExtendedMediaTrackSettings);

    const focusModeOptions = Array.isArray(capabilities.focusMode)
      ? capabilities.focusMode.filter((mode): mode is string => typeof mode === "string" && mode.trim().length > 0)
      : [];
    const focusDistanceRange = parseCameraControlRange(capabilities.focusDistance);
    const brightnessRange = parseCameraControlRange(capabilities.brightness);
    const exposureCompensationRange = parseCameraControlRange(capabilities.exposureCompensation);
    const apertureRange = parseCameraControlRange(capabilities.aperture);
    const zoomRange = parseCameraControlRange(capabilities.zoom);

    const initialFocusMode =
      typeof settings.focusMode === "string"
        ? settings.focusMode
        : focusModeOptions.length > 0
        ? focusModeOptions[0]
        : null;

    setTorchSupported(Boolean(capabilities.torch));
    setFlashEnabled(Boolean(settings.torch));
    setCameraControls({
      focusModeOptions,
      focusMode: initialFocusMode,
      focusDistanceRange,
      focusDistance: normalizeSettingNumber(settings.focusDistance, focusDistanceRange),
      brightnessRange,
      brightness: normalizeSettingNumber(settings.brightness, brightnessRange),
      exposureCompensationRange,
      exposureCompensation: normalizeSettingNumber(settings.exposureCompensation, exposureCompensationRange),
      apertureRange,
      aperture: normalizeSettingNumber(settings.aperture, apertureRange),
      zoomRange,
      zoom: normalizeSettingNumber(settings.zoom, zoomRange),
    });
  }, []);

  const applyAdvancedTrackConstraints = useCallback(async (constraints: AdvancedCameraConstraints): Promise<boolean> => {
    const track = videoTrackRef.current;
    if (!track) {
      return false;
    }

    try {
      await track.applyConstraints({
        advanced: [constraints as MediaTrackConstraintSet],
      });
      return true;
    } catch (applyError) {
      console.warn("[Camera] Failed to apply track constraints", applyError);
      return false;
    }
  }, []);

  const handleFocusModeChange = useCallback(
    async (nextMode: string) => {
      setCameraControls((prev) => ({ ...prev, focusMode: nextMode }));

      const applied = await applyAdvancedTrackConstraints({ focusMode: nextMode });
      if (!applied) {
        return;
      }

      if (nextMode === "manual" && cameraControls.focusDistanceRange && typeof cameraControls.focusDistance === "number") {
        const nextFocusDistance = clampToRange(cameraControls.focusDistance, cameraControls.focusDistanceRange);
        setCameraControls((prev) => ({ ...prev, focusDistance: nextFocusDistance }));
        await applyAdvancedTrackConstraints({ focusDistance: nextFocusDistance });
      }
    },
    [applyAdvancedTrackConstraints, cameraControls.focusDistance, cameraControls.focusDistanceRange]
  );

  const handleRangeControlChange = useCallback(
    async (controlKey: CameraControlKey, value: string) => {
      const nextValue = Number(value);
      if (!Number.isFinite(nextValue)) {
        return;
      }

      let range: CameraControlRange | null = null;
      if (controlKey === "focusDistance") range = cameraControls.focusDistanceRange;
      if (controlKey === "brightness") range = cameraControls.brightnessRange;
      if (controlKey === "exposureCompensation") range = cameraControls.exposureCompensationRange;
      if (controlKey === "aperture") range = cameraControls.apertureRange;
      if (controlKey === "zoom") range = cameraControls.zoomRange;

      const boundedValue = range ? clampToRange(nextValue, range) : nextValue;
      setCameraControls((prev) => ({ ...prev, [controlKey]: boundedValue }));

      if (
        controlKey === "focusDistance" &&
        cameraControls.focusModeOptions.includes("manual") &&
        cameraControls.focusMode !== "manual"
      ) {
        return;
      }

      await applyAdvancedTrackConstraints({ [controlKey]: boundedValue });
    },
    [
      applyAdvancedTrackConstraints,
      cameraControls.apertureRange,
      cameraControls.brightnessRange,
      cameraControls.exposureCompensationRange,
      cameraControls.focusDistanceRange,
      cameraControls.focusMode,
      cameraControls.focusModeOptions,
      cameraControls.zoomRange,
    ]
  );

  const handleTorchToggle = useCallback(async () => {
    if (!torchSupported) {
      return;
    }

    const nextState = !flashEnabled;
    const applied = await applyAdvancedTrackConstraints({ torch: nextState });
    if (applied) {
      setFlashEnabled(nextState);
    }
  }, [applyAdvancedTrackConstraints, flashEnabled, torchSupported]);

  const startCamera = useCallback(async () => {
    if (disabled) return;

    resetCameraControls();
    setError(null);
    setIsStarting(true);
    setIsStreaming(true);
    setCapturedImage(null);
    setIsVideoReady(false);
    setCaptureGuideBox(null);
    setModelInputPreview(null);
    setIsPreparingModelPreview(false);
    previewRequestIdRef.current += 1;

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      let mediaStream: MediaStream | null = null;

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 960 },
            torch: true,
          },
        });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      const videoTrack = mediaStream?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrackRef.current = videoTrack;
        initializeCameraControls(videoTrack);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        await videoRef.current.play();
      } else {
        setError("Video element not available");
        setIsStreaming(false);
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
        }
        resetCameraControls();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast.error(`Camera error: ${errorMessage}`);
      setIsStreaming(false);
      resetCameraControls();
    } finally {
      setIsStarting(false);
    }
  }, [disabled, initializeCameraControls, resetCameraControls]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    const handleLoadedMetadata = () => setIsVideoReady(true);
    const handleCanPlay = () => setIsVideoReady(true);

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);

    if (video.readyState >= 2) {
      setIsVideoReady(true);
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [stream]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  useEffect(() => {
    return () => {
      videoTrackRef.current = null;
    };
  }, []);

  const capturePhoto = useCallback(() => {
    if (disabled) return;

    if (!videoRef.current || !canvasRef.current) {
      toast.error("Camera not ready");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Camera feed not ready. Please wait a moment.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Failed to capture photo");
      return;
    }

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
    setQualitySource("canvas");
    setUploadedFile(null);

    // Run quality validation on the captured frame (test seam respected).
    const qualityResult = resolveCanvasImageQuality(canvas);
    setCaptureQualityResult(qualityResult);

    const guideBox: SquareGuideBox = resolveCenteredObjectCoverGuideBox({
      sourceWidth: video.videoWidth,
      sourceHeight: video.videoHeight,
      viewportWidth: video.clientWidth || video.videoWidth,
      viewportHeight: video.clientHeight || video.videoHeight,
      overlayWidthRatio: GUIDE_BOX_SIZE_RATIO,
    });
    setCaptureGuideBox(guideBox);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return;
        }

        const previewSourceFile = new File([blob], `preview-${Date.now()}.jpg`, { type: "image/jpeg" });
        void updateModelInputPreview(previewSourceFile, guideBox);
      },
      "image/jpeg",
      PREVIEW_EXPORT_QUALITY
    );

    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setIsStreaming(false);
    setIsVideoReady(false);
    resetCameraControls();
  }, [disabled, resetCameraControls, stream, updateModelInputPreview]);

  const handleCapturedImageLoad = useCallback(() => {
    if ((qualitySource !== "file" && qualitySource !== "cameraApp") || !uploadedFile || !capturedImageRef.current) {
      return;
    }

    const imageElement = capturedImageRef.current;
    const sourceWidth = imageElement.naturalWidth || imageElement.width;
    const sourceHeight = imageElement.naturalHeight || imageElement.height;
    const viewportWidth = imageElement.clientWidth || imageElement.width;
    const viewportHeight = imageElement.clientHeight || imageElement.height;

    if (sourceWidth <= 0 || sourceHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
      return;
    }

    const guideBox = resolveCenteredObjectCoverGuideBox({
      sourceWidth,
      sourceHeight,
      viewportWidth,
      viewportHeight,
      overlayWidthRatio: GUIDE_BOX_SIZE_RATIO,
    });

    setCaptureGuideBox(guideBox);
    void updateModelInputPreview(uploadedFile, guideBox);
  }, [qualitySource, updateModelInputPreview, uploadedFile]);

  useEffect(() => {
    if (allowFileUpload) return;
    if (qualitySource !== "file") return;

    setCapturedImage(null);
    setUploadedFile(null);
    setCaptureGuideBox(null);
    setModelInputPreview(null);
    setQualitySource("canvas");
  }, [allowFileUpload, qualitySource]);

  const confirmCapture = useCallback(() => {
    if (disabled) return;

    // Quality gate: block if the current capture has any fail-severity issue.
    if (captureQualityResult !== null && !captureQualityResult.canProceed) {
      return;
    }

    if (qualitySource === "file" || qualitySource === "cameraApp") {
      if (qualitySource === "file" && !allowFileUpload) {
        toast.error("File upload is only available in unlocked developer options.");
        return;
      }

      if (uploadedFile) {
        const captureSource = qualitySource === "cameraApp" ? "camera" : "file";
        onCapture({
          file: uploadedFile,
          guideBox: captureGuideBox,
          source: captureSource,
          capturedAt: new Date().toISOString(),
        });
      }
      return;
    }

    if (!canvasRef.current) return;

    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `inspection-${Date.now()}.jpg`, { type: "image/jpeg" });
          onCapture({
            file,
            guideBox: captureGuideBox,
            source: "camera",
            capturedAt: new Date().toISOString(),
          });
        }
      },
      "image/jpeg",
      0.9
    );
  }, [allowFileUpload, captureGuideBox, captureQualityResult, disabled, onCapture, qualitySource, uploadedFile]);

  const retake = useCallback(() => {
    if (disabled) return;

    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setIsStreaming(false);
    setIsVideoReady(false);
    setCapturedImage(null);
    setUploadedFile(null);
    setCaptureGuideBox(null);
    setModelInputPreview(null);
    setIsPreparingModelPreview(false);
    setCaptureQualityResult(null);
    previewRequestIdRef.current += 1;
    setQualitySource("canvas");
    resetCameraControls();
  }, [disabled, resetCameraControls, stream]);

  const prepareCapturedFile = useCallback(
    async (file: File, source: "file" | "cameraApp", inputElement: HTMLInputElement) => {
      // Legacy foreground/blur check using the existing assessFileQuality gate.
      // This keeps the meat-detection and off-center checks that are not yet
      // covered by the new validateImageQuality API.
      //
      // Test seam: window.__mockLegacyQualityAccepted bypasses this gate so
      // synthetic test fixtures (PNG icons etc.) are accepted in E2E tests.
      const legacyBypass = (window as Window & { __mockLegacyQualityAccepted?: boolean })
        .__mockLegacyQualityAccepted;
      if (!legacyBypass) {
        const legacyQuality = await assessFileQuality(file);
        if (!legacyQuality.accepted) {
          toast.error(legacyQuality.reasons.join(" "));
          inputElement.value = "";
          return;
        }
      }

      // Run the structured quality check and store the result for the UI.
      const qualityResult = await resolveFileImageQuality(file);
      setCaptureQualityResult(qualityResult);

      setUploadedFile(file);
      setQualitySource(source);
      setCaptureGuideBox(null);
      setModelInputPreview(null);
      setIsPreparingModelPreview(false);
      previewRequestIdRef.current += 1;
      const reader = new FileReader();
      reader.onload = (ev) => setCapturedImage(ev.target?.result as string);
      reader.readAsDataURL(file);
      inputElement.value = "";
    },
    []
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      if (!allowFileUpload) {
        toast.error("File upload is only available in unlocked developer options.");
        e.target.value = "";
        return;
      }

      const file = e.target.files?.[0];
      if (!file) return;
      await prepareCapturedFile(file, "file", e.target);
    },
    [allowFileUpload, disabled, prepareCapturedFile]
  );

  const handleCameraAppInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const file = e.target.files?.[0];
      if (!file) return;
      await prepareCapturedFile(file, "cameraApp", e.target);
    },
    [disabled, prepareCapturedFile]
  );

  const supportsManualFocusMode = cameraControls.focusModeOptions.includes("manual");
  const showManualFocusSlider = Boolean(cameraControls.focusDistanceRange);
  const hasManualControlSupport =
    torchSupported ||
    cameraControls.focusModeOptions.length > 0 ||
    Boolean(
      cameraControls.focusDistanceRange ||
      cameraControls.brightnessRange ||
      cameraControls.exposureCompensationRange ||
      cameraControls.apertureRange ||
      cameraControls.zoomRange
    );

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative w-full overflow-hidden rounded-2xl border border-border/70 bg-secondary aspect-[4/3] shadow-inner">
        {capturedImage ? (
          <>
            <img
              ref={capturedImageRef}
              src={capturedImage}
              alt="Captured"
              className="h-full w-full object-cover"
              onLoad={handleCapturedImageLoad}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="rounded-2xl border-2 border-dashed border-primary/75 shadow-[0_0_0_9999px_rgba(0,0,0,0.14)]"
                style={{
                  width: `${GUIDE_BOX_SIZE_RATIO * 100}%`,
                  aspectRatio: "1 / 1",
                }}
              />
                <p className="absolute bottom-4 rounded-full border border-primary/40 bg-background/80 px-3 py-1 text-[10px] uppercase tracking-wide text-primary">
                  {getActiveModelPreprocessContract() === "segmented_center_roi"
                    ? "Segmented center ROI -> 224x224 model input"
                    : (qualitySource === "file" || qualitySource === "cameraApp") && !captureGuideBox
                    ? "Center crop -> 224x224 model input"
                    : "Guide crop -> 224x224 model input"}
                </p>
            </div>

            {showModelInputPreview && (
              <div className="absolute right-3 top-3 rounded-lg border border-primary/30 bg-background/86 p-1.5 shadow-md">
                <p className="mb-1 text-[9px] font-display uppercase tracking-widest text-muted-foreground">
                  Model Input
                </p>
                <div className="h-14 w-14 overflow-hidden rounded-md border border-border/70 bg-secondary">
                  {modelInputPreview ? (
                    <img
                      src={modelInputPreview}
                      alt="224 by 224 model input preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[9px] text-muted-foreground">
                      {isPreparingModelPreview ? "..." : "N/A"}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[9px] font-display uppercase tracking-widest text-muted-foreground">224x224</p>
              </div>
            )}
          </>
        ) : isStreaming ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />

            {!isVideoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/80">
                <div className="text-center text-muted-foreground">
                  <Camera className="mx-auto mb-2 h-12 w-12 animate-pulse" />
                  <p className="font-display text-xs uppercase tracking-wider">Starting camera...</p>
                </div>
              </div>
            )}

            {isVideoReady && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className="rounded-2xl border-2 border-dashed border-primary/75 shadow-[0_0_0_9999px_rgba(0,0,0,0.14)]"
                    style={{
                      width: `${GUIDE_BOX_SIZE_RATIO * 100}%`,
                      aspectRatio: "1 / 1",
                    }}
                  />
                  <p className="absolute bottom-4 rounded-full border border-primary/40 bg-background/70 px-3 py-1 text-[10px] uppercase tracking-wide text-primary">
                    Place sample inside guide box
                  </p>
                </div>
                <div className="absolute inset-x-0 h-0.5 bg-primary/60 animate-scan-line" />
              </>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Camera className="h-12 w-12" />
            <p className="font-display text-xs uppercase tracking-wider">Ready to capture</p>
            {error && <p className="mt-2 px-4 text-center text-[10px] text-destructive">Error: {error}</p>}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {isStreaming && isVideoReady && (
        <div className="w-full rounded-2xl border border-border/70 bg-background/65 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-display uppercase tracking-widest text-muted-foreground">Camera Controls</p>
            {torchSupported && (
              <Button
                type="button"
                size="sm"
                variant={flashEnabled ? "default" : "outline"}
                className="h-7 rounded-full px-3 text-[10px] uppercase tracking-wide"
                onClick={() => void handleTorchToggle()}
              >
                {flashEnabled ? "Flash On" : "Flash Off"}
              </Button>
            )}
          </div>

          {hasManualControlSupport ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {cameraControls.focusModeOptions.length > 0 && (
                  <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Focus Mode
                    <select
                      aria-label="Focus mode"
                      value={cameraControls.focusMode ?? ""}
                      onChange={(event) => void handleFocusModeChange(event.target.value)}
                      className="h-9 rounded-md border border-border/70 bg-background px-2 text-xs text-foreground"
                    >
                      {cameraControls.focusModeOptions.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {showManualFocusSlider && cameraControls.focusDistanceRange && (
                  <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Manual Focus
                    <input
                      aria-label="Manual focus"
                      type="range"
                      min={cameraControls.focusDistanceRange.min}
                      max={cameraControls.focusDistanceRange.max}
                      step={cameraControls.focusDistanceRange.step}
                      value={cameraControls.focusDistance ?? cameraControls.focusDistanceRange.min}
                      disabled={supportsManualFocusMode && cameraControls.focusMode !== "manual"}
                      onChange={(event) => void handleRangeControlChange("focusDistance", event.target.value)}
                    />
                    <span className="text-[10px] text-foreground">{formatControlValue(cameraControls.focusDistance)}</span>
                  </label>
                )}

                {cameraControls.brightnessRange && (
                  <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Brightness
                    <input
                      aria-label="Brightness"
                      type="range"
                      min={cameraControls.brightnessRange.min}
                      max={cameraControls.brightnessRange.max}
                      step={cameraControls.brightnessRange.step}
                      value={cameraControls.brightness ?? cameraControls.brightnessRange.min}
                      onChange={(event) => void handleRangeControlChange("brightness", event.target.value)}
                    />
                    <span className="text-[10px] text-foreground">{formatControlValue(cameraControls.brightness)}</span>
                  </label>
                )}

                {cameraControls.exposureCompensationRange && (
                  <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Exposure
                    <input
                      aria-label="Exposure"
                      type="range"
                      min={cameraControls.exposureCompensationRange.min}
                      max={cameraControls.exposureCompensationRange.max}
                      step={cameraControls.exposureCompensationRange.step}
                      value={cameraControls.exposureCompensation ?? cameraControls.exposureCompensationRange.min}
                      onChange={(event) => void handleRangeControlChange("exposureCompensation", event.target.value)}
                    />
                    <span className="text-[10px] text-foreground">
                      {formatControlValue(cameraControls.exposureCompensation)}
                    </span>
                  </label>
                )}

                {cameraControls.apertureRange && (
                  <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Aperture
                    <input
                      aria-label="Aperture"
                      type="range"
                      min={cameraControls.apertureRange.min}
                      max={cameraControls.apertureRange.max}
                      step={cameraControls.apertureRange.step}
                      value={cameraControls.aperture ?? cameraControls.apertureRange.min}
                      onChange={(event) => void handleRangeControlChange("aperture", event.target.value)}
                    />
                    <span className="text-[10px] text-foreground">{formatControlValue(cameraControls.aperture)}</span>
                  </label>
                )}

                {cameraControls.zoomRange && (
                  <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Zoom
                    <input
                      aria-label="Zoom"
                      type="range"
                      min={cameraControls.zoomRange.min}
                      max={cameraControls.zoomRange.max}
                      step={cameraControls.zoomRange.step}
                      value={cameraControls.zoom ?? cameraControls.zoomRange.min}
                      onChange={(event) => void handleRangeControlChange("zoom", event.target.value)}
                    />
                    <span className="text-[10px] text-foreground">{formatControlValue(cameraControls.zoom)}</span>
                  </label>
                )}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Hardware support varies. Aperture is exposed only when the camera driver and browser provide it.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Manual camera controls are unavailable on this device/browser.</p>
          )}
        </div>
      )}

      {capturedImage && captureQualityResult !== null && captureQualityResult.issues.length > 0 && (
        <div
          data-testid="quality-banner"
          className={cn(
            "w-full rounded-xl border px-3 py-2.5",
            captureQualityResult.canProceed
              ? "border-warning/40 bg-warning/10 text-foreground"
              : "border-destructive/40 bg-destructive/10 text-foreground"
          )}
        >
          <div className="flex items-start gap-2">
            {captureQualityResult.canProceed ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-wide",
                  captureQualityResult.canProceed ? "text-warning" : "text-destructive"
                )}
              >
                {captureQualityResult.canProceed ? "Quality Warning" : "Quality Check Failed"}
              </p>
              <ul className="mt-0.5 space-y-0.5">
                {captureQualityResult.issues.map((issue) => (
                  <li key={issue.code} className="text-[11px] leading-snug opacity-90">
                    {issue.message}
                  </li>
                ))}
              </ul>
              {captureQualityResult.canProceed && (
                <p className="mt-1 text-[10px] opacity-70">
                  You may still proceed, but accuracy may be reduced.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex w-full flex-col gap-3 min-[380px]:flex-row">
        {capturedImage ? (
          <>
            <Button variant="outline" onClick={retake} disabled={disabled} className="w-full gap-2 rounded-xl min-[380px]:flex-1">
              <RotateCcw className="h-4 w-4" /> Retake
            </Button>
            <Button
              onClick={confirmCapture}
              disabled={disabled || (captureQualityResult !== null && !captureQualityResult.canProceed)}
              className="w-full gap-2 rounded-xl min-[380px]:flex-1"
            >
              <Check className="h-4 w-4" /> Use Photo
            </Button>
          </>
) : isStreaming ? (
          <Button onClick={capturePhoto} size="lg" className="w-full gap-2 rounded-xl" disabled={disabled || !isVideoReady}>
            <Camera className="h-5 w-5" /> {isVideoReady ? "Capture" : "Starting..."}
          </Button>
        ) : (
          <div className="flex w-full flex-col gap-3 min-[380px]:flex-row">
            <Button
              onClick={() => void startCamera()}
              size="lg"
              className="w-full gap-2 rounded-xl min-[380px]:flex-1"
              disabled={disabled || isStarting}
            >
              <Camera className="h-5 w-5" /> {isStarting ? "Starting..." : "Open Camera"}
            </Button>
            <label className="w-full min-[380px]:flex-1">
              <Button
                variant="outline"
                size="lg"
                className="w-full cursor-pointer gap-2 rounded-xl"
                disabled={disabled}
                asChild
              >
                <span>Use Camera App</span>
              </Button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={disabled}
                onChange={handleCameraAppInput}
              />
            </label>
            {allowFileUpload && (
              <label className="w-full min-[380px]:flex-1">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full cursor-pointer gap-2 rounded-xl"
                  disabled={disabled}
                  asChild
                >
                  <span>Upload File</span>
                </Button>
                <input type="file" accept="image/*" className="hidden" disabled={disabled} onChange={handleFileInput} />
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
