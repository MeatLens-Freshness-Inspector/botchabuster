import {
  EMPTY_CAMERA_CONTROLS,
  normalizeSettingNumber,
  parseCameraControlRange,
  type AdvancedCameraConstraints,
  type CameraControlsState,
  type ExtendedMediaTrackCapabilities,
  type ExtendedMediaTrackSettings,
} from "../../../components/camera/controls";

export interface CameraDeviceState {
  torchSupported: boolean;
  flashEnabled: boolean;
  cameraControls: CameraControlsState;
}

export interface CameraDeviceMediaSource {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
}

export function inspectCameraTrack(track: MediaStreamTrack): CameraDeviceState {
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

  return {
    torchSupported: Boolean(capabilities.torch),
    flashEnabled: Boolean(settings.torch),
    cameraControls: {
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
    },
  };
}

export async function requestCameraStream(
  mediaDevices: CameraDeviceMediaSource = navigator.mediaDevices,
): Promise<MediaStream> {
  try {
    return await mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 960 },
        torch: true,
      },
    });
  } catch {
    return mediaDevices.getUserMedia({ video: true });
  }
}

export async function applyCameraTrackConstraints(
  track: MediaStreamTrack | null,
  constraints: AdvancedCameraConstraints,
): Promise<boolean> {
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
}

export function stopCameraStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function emptyCameraDeviceState(): CameraDeviceState {
  return {
    torchSupported: false,
    flashEnabled: false,
    cameraControls: EMPTY_CAMERA_CONTROLS,
  };
}
