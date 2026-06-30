import assert from "node:assert/strict";
import test from "node:test";

import React, { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { EMPTY_CAMERA_CONTROLS } from "../src/components/camera/controls";
import {
  CameraCaptureView,
  type CameraCaptureViewProps,
} from "../src/components/camera/CameraCaptureView";

function buildProps(
  overrides: Partial<CameraCaptureViewProps> = {},
): CameraCaptureViewProps {
  return {
    className: undefined,
    disabled: false,
    allowFileUpload: false,
    allowInAppCamera: false,
    showModelInputPreview: true,
    capturedImage: null,
    capturedImageRef: createRef<HTMLImageElement>(),
    onCapturedImageLoad: () => undefined,
    isStreaming: false,
    isVideoReady: false,
    videoRef: createRef<HTMLVideoElement>(),
    canvasRef: createRef<HTMLCanvasElement>(),
    error: null,
    modelInputLabel: "Guide crop -> 224x224 model input",
    modelInputPreview: null,
    isPreparingModelPreview: false,
    torchSupported: false,
    flashEnabled: false,
    cameraControls: EMPTY_CAMERA_CONTROLS,
    supportsManualFocusMode: false,
    showManualFocusSlider: false,
    hasManualControlSupport: false,
    captureQualityResult: null,
    isStarting: false,
    onTorchToggle: () => undefined,
    onFocusModeChange: () => undefined,
    onRangeControlChange: () => undefined,
    onRetake: () => undefined,
    onConfirmCapture: () => undefined,
    onCapturePhoto: () => undefined,
    onStartCamera: () => undefined,
    onFileInput: () => undefined,
    onCameraAppInput: () => undefined,
    ...overrides,
  };
}

test("CameraCaptureView renders the idle capture entrypoints from props", () => {
  const markup = renderToStaticMarkup(
    <CameraCaptureView
      {...buildProps({
        allowFileUpload: true,
        allowInAppCamera: true,
      })}
    />,
  );

  assert.match(markup, /Open Camera/);
  assert.match(markup, /In-App Cam/);
  assert.match(markup, /Upload File/);
  assert.doesNotMatch(markup, /Use Photo/);
});

test("CameraCaptureView renders the captured warning state without losing action buttons", () => {
  const markup = renderToStaticMarkup(
    <CameraCaptureView
      {...buildProps({
        capturedImage: "data:image/jpeg;base64,dGVzdA==",
        captureQualityResult: {
          status: "warning",
          issues: [
            {
              code: "TOO_DARK",
              message: "Image is underexposed.",
              severity: "warning",
            },
          ],
          metrics: { width: 640, height: 480, brightness: 42 },
          canProceed: true,
        },
      })}
    />,
  );

  assert.match(markup, /Quality Warning/);
  assert.match(markup, /Image is underexposed/);
  assert.match(markup, /Retake/);
  assert.match(markup, /Use Photo/);
  assert.match(markup, /224x224 model input/);
});
