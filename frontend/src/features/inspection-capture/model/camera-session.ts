import { useRef, useState, useCallback, useEffect } from "react";

import { toast } from "sonner";

import { assessFileQuality } from "../lib/capture-quality";
import { type ImageQualityResult } from "../lib/image-quality";
import {
  createModelInputImageFile,
  DEFAULT_MEATLENS_INPUT_SIZE,
  resolveCenteredObjectCoverGuideBox,
  type SquareGuideBox,
} from "@/features/offline-analysis";
import { getActiveModelPreprocessContract } from "@/features/offline-analysis";
import { resolveModelInputPreviewOptions } from "./model-input-preview";

import { GUIDE_BOX_SIZE_RATIO, PREVIEW_EXPORT_QUALITY } from "./camera-constants";
import {
  clampToRange,
  type AdvancedCameraConstraints,
  type CameraControlKey,
  type CameraControlRange,
  type CameraControlsState,
} from "../lib/controls";
import {
  readBlobAsDataUrl,
  resolveCanvasImageQuality,
  resolveFileImageQuality,
} from "../lib/quality";
import type { CameraCaptureProps, CameraCaptureViewProps, CaptureQualitySource } from "./types";
import {
  applyCameraTrackConstraints,
  emptyCameraDeviceState,
  inspectCameraTrack,
  requestCameraStream,
  stopCameraStream,
} from "./camera-device";

export function useCameraCapture({
  onCapture,
  className,
  disabled = false,
  allowFileUpload = false,
  allowInAppCamera = false,
  showModelInputPreview = true,
  disableRoiSegmentation = false,
}: CameraCaptureProps): CameraCaptureViewProps {
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
  const [modelPreviewSourceFile, setModelPreviewSourceFile] = useState<File | null>(null);
  const [captureGuideBox, setCaptureGuideBox] = useState<SquareGuideBox | null>(null);
  const [modelInputPreview, setModelInputPreview] = useState<string | null>(null);
  const [isPreparingModelPreview, setIsPreparingModelPreview] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraControls, setCameraControls] = useState<CameraControlsState>(
    () => emptyCameraDeviceState().cameraControls,
  );
  const [captureQualityResult, setCaptureQualityResult] = useState<ImageQualityResult | null>(null);

  const updateModelInputPreview = useCallback(async (sourceFile: File, guideBox: SquareGuideBox | null) => {
    const requestId = ++previewRequestIdRef.current;
    setIsPreparingModelPreview(true);

    try {
      const preparation = resolveModelInputPreviewOptions({
        preprocessContract: getActiveModelPreprocessContract(),
        guideBox,
        disableRoiSegmentation,
      });
      const preparedInput = await createModelInputImageFile(sourceFile, {
        ...preparation,
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
  }, [disableRoiSegmentation]);

  const resetCameraControls = useCallback(() => {
    videoTrackRef.current = null;
    const emptyState = emptyCameraDeviceState();
    setTorchSupported(emptyState.torchSupported);
    setFlashEnabled(emptyState.flashEnabled);
    setCameraControls(emptyState.cameraControls);
  }, []);

  const applyAdvancedTrackConstraints = useCallback(async (constraints: AdvancedCameraConstraints): Promise<boolean> => {
    return applyCameraTrackConstraints(videoTrackRef.current, constraints);
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
    setModelPreviewSourceFile(null);
    setModelInputPreview(null);
    setIsPreparingModelPreview(false);
    previewRequestIdRef.current += 1;

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const mediaStream = await requestCameraStream();

      const videoTrack = mediaStream?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrackRef.current = videoTrack;
        const deviceState = inspectCameraTrack(videoTrack);
        setTorchSupported(deviceState.torchSupported);
        setFlashEnabled(deviceState.flashEnabled);
        setCameraControls(deviceState.cameraControls);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        await videoRef.current.play();
      } else {
        setError("Video element not available");
        setIsStreaming(false);
        if (mediaStream) {
          stopCameraStream(mediaStream);
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
  }, [disabled, resetCameraControls]);

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
      stopCameraStream(stream);
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
        setModelPreviewSourceFile(previewSourceFile);
      },
      "image/jpeg",
      PREVIEW_EXPORT_QUALITY
    );

    stopCameraStream(stream);
    setStream(null);
    setIsStreaming(false);
    setIsVideoReady(false);
    resetCameraControls();
  }, [disabled, resetCameraControls, stream]);

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
    if (!modelPreviewSourceFile) return;
    void updateModelInputPreview(modelPreviewSourceFile, captureGuideBox);
  }, [captureGuideBox, modelPreviewSourceFile, updateModelInputPreview]);

  useEffect(() => {
    if (allowFileUpload) return;
    if (qualitySource !== "file") return;

    setCapturedImage(null);
    setUploadedFile(null);
    setModelPreviewSourceFile(null);
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

    stopCameraStream(stream);
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
      setModelPreviewSourceFile(file);
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
      ? disableRoiSegmentation
        ? "Center crop -> 224x224 model input"
        : "Segmented center ROI -> 224x224 model input"
      : (qualitySource === "file" || qualitySource === "cameraApp") && !captureGuideBox
      ? "Center crop -> 224x224 model input"
      : "Guide crop -> 224x224 model input";

  return {
    className,
    disabled,
    allowFileUpload,
    allowInAppCamera,
    showModelInputPreview,
    capturedImage,
    capturedImageRef,
    onCapturedImageLoad: handleCapturedImageLoad,
    isStreaming,
    isVideoReady,
    videoRef,
    canvasRef,
    error,
    modelInputLabel,
    modelInputPreview,
    isPreparingModelPreview,
    torchSupported,
    flashEnabled,
    cameraControls,
    supportsManualFocusMode,
    showManualFocusSlider,
    hasManualControlSupport,
    captureQualityResult,
    isStarting,
    onTorchToggle: () => void handleTorchToggle(),
    onFocusModeChange: (nextMode) => void handleFocusModeChange(nextMode),
    onRangeControlChange: (controlKey, value) => void handleRangeControlChange(controlKey, value),
    onRetake: retake,
    onConfirmCapture: confirmCapture,
    onCapturePhoto: capturePhoto,
    onStartCamera: () => void startCamera(),
    onFileInput: handleFileInput,
    onCameraAppInput: handleCameraAppInput,
  };
}
