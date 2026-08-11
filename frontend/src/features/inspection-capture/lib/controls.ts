export type CameraControlKey =
  | "focusDistance"
  | "brightness"
  | "exposureCompensation"
  | "zoom"
  | "aperture";

export interface CameraControlRange {
  min: number;
  max: number;
  step: number;
}

export interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
  focusMode?: string[];
  focusDistance?: MediaSettingsRange;
  brightness?: MediaSettingsRange;
  exposureCompensation?: MediaSettingsRange;
  zoom?: MediaSettingsRange;
  aperture?: MediaSettingsRange;
}

export interface ExtendedMediaTrackSettings extends MediaTrackSettings {
  torch?: boolean;
  focusMode?: string;
  focusDistance?: number;
  brightness?: number;
  exposureCompensation?: number;
  zoom?: number;
  aperture?: number;
}

export interface AdvancedCameraConstraints extends MediaTrackConstraintSet {
  torch?: boolean;
  focusMode?: string;
  focusDistance?: number;
  brightness?: number;
  exposureCompensation?: number;
  zoom?: number;
  aperture?: number;
}

export interface CameraControlsState {
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

export const EMPTY_CAMERA_CONTROLS: CameraControlsState = {
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

export function parseCameraControlRange(value: unknown): CameraControlRange | null {
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

export function clampToRange(value: number, range: CameraControlRange): number {
  return Math.min(range.max, Math.max(range.min, value));
}

export function normalizeSettingNumber(value: unknown, range: CameraControlRange | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return range ? range.min : null;
  }

  if (!range) {
    return value;
  }

  return clampToRange(value, range);
}

export function formatControlValue(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
