import type { AnalysisResult } from "@/entities/inspection";
import {
  isAnalysisModelSelection,
  PRIMARY_ANALYSIS_MODEL,
  type AnalysisModelSelection,
} from "@/features/offline-analysis";
import { readJson, writeJson } from "@/shared/lib/storage";

const DEV_OPTIONS_FLAGS_KEY_PREFIX = "meatlens-developer-options-flags";
const DEV_OPTIONS_SESSION_KEY_PREFIX = "meatlens-developer-options-session";
const DEV_OPTIONS_SNAPSHOT_KEY_PREFIX = "meatlens-developer-options-last-analysis";

export interface DeveloperOptionsFlags {
  selectedModel: AnalysisModelSelection;
  enableDebugFileUpload: boolean;
  bypassPreScanChecklist: boolean;
  persistAnalysisSnapshots: boolean;
  verboseOfflineSyncLogs: boolean;
  skipModelPrewarm: boolean;
  showModelInputPreview: boolean;
  disableRoiSegmentation: boolean;
}

export interface DeveloperOptionsSession {
  token: string;
  expiresAt: string;
}

export interface DeveloperAnalysisSnapshot {
  capturedAt: string;
  source: "camera" | "file";
  meatType: string;
  location: string | null;
  result: AnalysisResult;
}

export const DEFAULT_DEVELOPER_OPTIONS_FLAGS: DeveloperOptionsFlags = {
  selectedModel: PRIMARY_ANALYSIS_MODEL,
  enableDebugFileUpload: false,
  bypassPreScanChecklist: false,
  persistAnalysisSnapshots: false,
  verboseOfflineSyncLogs: false,
  skipModelPrewarm: false,
  showModelInputPreview: true,
  disableRoiSegmentation: false,
};

interface LegacyDeveloperOptionsPayload {
  selectedModel?: unknown;
  enableModelEnsemble?: unknown;
  useRoboflowModel3?: unknown;
  useSeed123Model2?: unknown;
}

function resolveStoredModelSelection(stored: LegacyDeveloperOptionsPayload | null): AnalysisModelSelection {
  if (isAnalysisModelSelection(stored?.selectedModel)) {
    return stored.selectedModel;
  }

  if (stored?.enableModelEnsemble === true) {
    return "ensemble";
  }

  if (stored?.useRoboflowModel3 === true) {
    return "primary";
  }

  // The former default was seed123. Treat that legacy default as the new primary.
  if (stored?.useSeed123Model2 === true) {
    return PRIMARY_ANALYSIS_MODEL;
  }

  return PRIMARY_ANALYSIS_MODEL;
}

function resolveFlagsStorageKey(userId: string): string {
  return `${DEV_OPTIONS_FLAGS_KEY_PREFIX}:${userId}`;
}

function resolveSessionStorageKey(userId: string): string {
  return `${DEV_OPTIONS_SESSION_KEY_PREFIX}:${userId}`;
}

function resolveAnalysisSnapshotStorageKey(userId: string): string {
  return `${DEV_OPTIONS_SNAPSHOT_KEY_PREFIX}:${userId}`;
}

function getLocalStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function getDeveloperOptionsFlags(userId: string): DeveloperOptionsFlags {
  const stored = readJson<Partial<DeveloperOptionsFlags> & LegacyDeveloperOptionsPayload>(
    getLocalStorage(),
    resolveFlagsStorageKey(userId),
  );
  if (!stored) return { ...DEFAULT_DEVELOPER_OPTIONS_FLAGS };

  return {
    ...DEFAULT_DEVELOPER_OPTIONS_FLAGS,
    ...stored,
    selectedModel: resolveStoredModelSelection(stored),
  };
}

export function setDeveloperOptionsFlags(userId: string, flags: DeveloperOptionsFlags): void {
  writeJson(getLocalStorage(), resolveFlagsStorageKey(userId), flags);
}

export function getDeveloperOptionsSession(userId: string): DeveloperOptionsSession | null {
  return readJson<DeveloperOptionsSession>(getLocalStorage(), resolveSessionStorageKey(userId));
}

export function setDeveloperOptionsSession(userId: string, session: DeveloperOptionsSession): void {
  writeJson(getLocalStorage(), resolveSessionStorageKey(userId), session);
}

export function clearDeveloperOptionsSession(userId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(resolveSessionStorageKey(userId));
}

export function isDeveloperOptionsSessionExpired(session: DeveloperOptionsSession): boolean {
  const expiresAt = Date.parse(session.expiresAt);
  if (Number.isNaN(expiresAt)) return true;
  return expiresAt <= Date.now();
}

export function saveDeveloperAnalysisSnapshot(userId: string, snapshot: DeveloperAnalysisSnapshot): void {
  writeJson(getLocalStorage(), resolveAnalysisSnapshotStorageKey(userId), snapshot);
}

export function getDeveloperAnalysisSnapshot(userId: string): DeveloperAnalysisSnapshot | null {
  return readJson<DeveloperAnalysisSnapshot>(getLocalStorage(), resolveAnalysisSnapshotStorageKey(userId));
}

export function clearDeveloperAnalysisSnapshot(userId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(resolveAnalysisSnapshotStorageKey(userId));
}
