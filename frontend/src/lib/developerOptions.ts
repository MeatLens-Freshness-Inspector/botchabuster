import type { AnalysisResult } from "@/types/inspection";

const DEV_OPTIONS_FLAGS_KEY_PREFIX = "meatlens-developer-options-flags";
const DEV_OPTIONS_SESSION_KEY_PREFIX = "meatlens-developer-options-session";
const DEV_OPTIONS_SNAPSHOT_KEY_PREFIX = "meatlens-developer-options-last-analysis";

export interface DeveloperOptionsFlags {
  enableDebugFileUpload: boolean;
  bypassPreScanChecklist: boolean;
  persistAnalysisSnapshots: boolean;
  verboseOfflineSyncLogs: boolean;
  skipModelPrewarm: boolean;
  showModelInputPreview: boolean;
  useSeed123Model2: boolean;
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
  enableDebugFileUpload: false,
  bypassPreScanChecklist: false,
  persistAnalysisSnapshots: false,
  verboseOfflineSyncLogs: false,
  skipModelPrewarm: false,
  showModelInputPreview: true,
  useSeed123Model2: true,
};

function resolveFlagsStorageKey(userId: string): string {
  return `${DEV_OPTIONS_FLAGS_KEY_PREFIX}:${userId}`;
}

function resolveSessionStorageKey(userId: string): string {
  return `${DEV_OPTIONS_SESSION_KEY_PREFIX}:${userId}`;
}

function resolveAnalysisSnapshotStorageKey(userId: string): string {
  return `${DEV_OPTIONS_SNAPSHOT_KEY_PREFIX}:${userId}`;
}

function readJson<T>(storageKey: string): T | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(storageKey: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

export function getDeveloperOptionsFlags(userId: string): DeveloperOptionsFlags {
  const stored = readJson<Partial<DeveloperOptionsFlags>>(resolveFlagsStorageKey(userId));
  if (!stored) return { ...DEFAULT_DEVELOPER_OPTIONS_FLAGS };

  return {
    ...DEFAULT_DEVELOPER_OPTIONS_FLAGS,
    ...stored,
  };
}

export function setDeveloperOptionsFlags(userId: string, flags: DeveloperOptionsFlags): void {
  writeJson(resolveFlagsStorageKey(userId), flags);
}

export function getDeveloperOptionsSession(userId: string): DeveloperOptionsSession | null {
  return readJson<DeveloperOptionsSession>(resolveSessionStorageKey(userId));
}

export function setDeveloperOptionsSession(userId: string, session: DeveloperOptionsSession): void {
  writeJson(resolveSessionStorageKey(userId), session);
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
  writeJson(resolveAnalysisSnapshotStorageKey(userId), snapshot);
}

export function getDeveloperAnalysisSnapshot(userId: string): DeveloperAnalysisSnapshot | null {
  return readJson<DeveloperAnalysisSnapshot>(resolveAnalysisSnapshotStorageKey(userId));
}

export function clearDeveloperAnalysisSnapshot(userId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(resolveAnalysisSnapshotStorageKey(userId));
}
