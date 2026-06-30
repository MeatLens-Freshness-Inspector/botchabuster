import { useRef, useState, useCallback, useEffect } from "react";

import { toast } from "sonner";

import { assessFileQuality } from "../../lib/captureQuality";
import { type ImageQualityResult } from "../../lib/imageQuality";
import {
  createModelInputImageFile,
  DEFAULT_MEATLENS_INPUT_SIZE,
  resolveCenteredObjectCoverGuideBox,
  type SquareGuideBox,
} from "../../lib/offlineAnalysis/meatLensPipeline";
import { getActiveModelPreprocessContract } from "../../lib/offlineAnalysis/mobileNetV3";

import { CameraCaptureView } from "./CameraCaptureView";
import { GUIDE_BOX_SIZE_RATIO, PREVIEW_EXPORT_QUALITY } from "./constants";
import {
  clampToRange,
  EMPTY_CAMERA_CONTROLS,
  normalizeSettingNumber,
  parseCameraControlRange,
  type AdvancedCameraConstraints,
  type CameraControlKey,
  type CameraControlRange,
  type CameraControlsState,
  type ExtendedMediaTrackCapabilities,
  type ExtendedMediaTrackSettings,
} from "./controls";
import {
  readBlobAsDataUrl,
  resolveCanvasImageQuality,
  resolveFileImageQuality,
} from "./quality";
import {
  type CameraCaptureProps,
  type CaptureQualitySource,
} from "./types";

export function CameraCapture({
  onCapture,
  className,
  disabled = false,
  allowFileUpload = false,
  allowInAppCamera = false,
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
  const [qualitySource, setQualitySource] = useState<CaptureQualitySource>("canvas");
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
  const modelInputLabel =
    getActiveModelPreprocessContract() === "segmented_center_roi"
      ? "Segmented center ROI -> 224x224 model input"
      : (qualitySource === "file" || qualitySource === "cameraApp") && !captureGuideBox
      ? "Center crop -> 224x224 model input"
      : "Guide crop -> 224x224 model input";

  return (
    <CameraCaptureView
      className={className}
      disabled={disabled}
      allowFileUpload={allowFileUpload}
      allowInAppCamera={allowInAppCamera}
      showModelInputPreview={showModelInputPreview}
      capturedImage={capturedImage}
      capturedImageRef={capturedImageRef}
      onCapturedImageLoad={handleCapturedImageLoad}
      isStreaming={isStreaming}
      isVideoReady={isVideoReady}
      videoRef={videoRef}
      canvasRef={canvasRef}
      error={error}
      modelInputLabel={modelInputLabel}
      modelInputPreview={modelInputPreview}
      isPreparingModelPreview={isPreparingModelPreview}
      torchSupported={torchSupported}
      flashEnabled={flashEnabled}
      cameraControls={cameraControls}
      supportsManualFocusMode={supportsManualFocusMode}
      showManualFocusSlider={showManualFocusSlider}
      hasManualControlSupport={hasManualControlSupport}
      captureQualityResult={captureQualityResult}
      isStarting={isStarting}
      onTorchToggle={() => void handleTorchToggle()}
      onFocusModeChange={(nextMode) => void handleFocusModeChange(nextMode)}
      onRangeControlChange={(controlKey, value) => void handleRangeControlChange(controlKey, value)}
      onRetake={retake}
      onConfirmCapture={confirmCapture}
      onCapturePhoto={capturePhoto}
      onStartCamera={() => void startCamera()}
      onFileInput={handleFileInput}
      onCameraAppInput={handleCameraAppInput}
    />
  );
}
