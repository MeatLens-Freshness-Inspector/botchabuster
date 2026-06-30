import React, { type ChangeEventHandler, type RefObject } from "react";

import { Camera, RotateCcw, Check, AlertTriangle, XCircle } from "lucide-react";

import type { ImageQualityResult } from "../../lib/imageQuality";
import { cn } from "../../lib/utils";
import { Button, buttonVariants } from "../ui/button";

import { formatControlValue, type CameraControlKey, type CameraControlsState } from "./controls";

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

export function CameraCaptureView({
  className,
  disabled,
  allowFileUpload,
  allowInAppCamera,
  showModelInputPreview,
  capturedImage,
  capturedImageRef,
  onCapturedImageLoad,
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
  onTorchToggle,
  onFocusModeChange,
  onRangeControlChange,
  onRetake,
  onConfirmCapture,
  onCapturePhoto,
  onStartCamera,
  onFileInput,
  onCameraAppInput,
}: CameraCaptureViewProps) {
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
              onLoad={onCapturedImageLoad}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="rounded-2xl border-2 border-dashed border-primary/75 shadow-[0_0_0_9999px_rgba(0,0,0,0.14)]"
                style={{
                  width: "72%",
                  aspectRatio: "1 / 1",
                }}
              />
              <p className="absolute bottom-4 rounded-full border border-primary/40 bg-background/80 px-3 py-1 text-[10px] uppercase tracking-wide text-primary">
                {modelInputLabel}
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
                <p className="mt-1 text-[9px] font-display uppercase tracking-widest text-muted-foreground">
                  224x224
                </p>
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
                      width: "72%",
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
                onClick={onTorchToggle}
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
                      onChange={(event) => onFocusModeChange(event.target.value)}
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
                      onChange={(event) => onRangeControlChange("focusDistance", event.target.value)}
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
                      onChange={(event) => onRangeControlChange("brightness", event.target.value)}
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
                      onChange={(event) => onRangeControlChange("exposureCompensation", event.target.value)}
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
                      onChange={(event) => onRangeControlChange("aperture", event.target.value)}
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
                      onChange={(event) => onRangeControlChange("zoom", event.target.value)}
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
            <Button variant="outline" onClick={onRetake} disabled={disabled} className="w-full gap-2 rounded-xl min-[380px]:flex-1">
              <RotateCcw className="h-4 w-4" /> Retake
            </Button>
            <Button
              onClick={onConfirmCapture}
              disabled={disabled || (captureQualityResult !== null && !captureQualityResult.canProceed)}
              className="w-full gap-2 rounded-xl min-[380px]:flex-1"
            >
              <Check className="h-4 w-4" /> Use Photo
            </Button>
          </>
        ) : isStreaming ? (
          <Button onClick={onCapturePhoto} size="lg" className="w-full gap-2 rounded-xl" disabled={disabled || !isVideoReady}>
            <Camera className="h-5 w-5" /> {isVideoReady ? "Capture" : "Starting..."}
          </Button>
        ) : (
          <div className="flex w-full flex-col gap-3 min-[380px]:flex-row">
            <label
              role="button"
              aria-disabled={disabled || undefined}
              className={cn(
                buttonVariants({ size: "lg" }),
                "relative w-full cursor-pointer gap-2 rounded-xl min-[380px]:flex-1",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              <span className="pointer-events-none inline-flex items-center gap-2">
                <Camera className="h-5 w-5" /> Open Camera
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                aria-label="Open Camera"
                className="absolute inset-0 cursor-pointer opacity-0"
                disabled={disabled}
                onChange={onCameraAppInput}
              />
            </label>
            {allowInAppCamera && (
              <Button
                onClick={onStartCamera}
                variant="outline"
                size="lg"
                className="w-full gap-2 rounded-xl min-[380px]:flex-1"
                disabled={disabled || isStarting}
              >
                <Camera className="h-5 w-5" /> {isStarting ? "Starting..." : "In-App Cam"}
              </Button>
            )}
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
                <input type="file" accept="image/*" className="hidden" disabled={disabled} onChange={onFileInput} />
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
