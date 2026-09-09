import type { OfflineAuthEnvelope } from "@/entities/user/model/offline-auth-envelope";
import type { AuthSession } from "@/entities/user/model/session-types";

export const NATIVE_AUTH_RECORD_VERSION = 1 as const;

export interface NativeAuthRecord {
  version: typeof NATIVE_AUTH_RECORD_VERSION;
  userId: string;
  session: AuthSession | null;
  offlineEnvelope: OfflineAuthEnvelope;
  authenticatedAt: string;
  expiresAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function assertNativeAuthRecord(value: unknown): asserts value is NativeAuthRecord {
  if (!isRecord(value)) {
    throw new Error("Native auth record is invalid");
  }
  if (value.version !== NATIVE_AUTH_RECORD_VERSION) {
    throw new Error("Native auth record version is unsupported");
  }
  if (typeof value.userId !== "string" || value.userId.trim().length === 0) {
    throw new Error("Native auth record user is invalid");
  }
  if (!isRecord(value.offlineEnvelope) || typeof value.offlineEnvelope.user !== "object" || value.offlineEnvelope.user === null) {
    throw new Error("Native auth record offline envelope is invalid");
  }
  const envelopeUser = value.offlineEnvelope.user as { id?: unknown };
  if (envelopeUser.id !== value.userId) {
    throw new Error("Native auth record user does not match offline envelope user");
  }
  if (!isIsoDate(value.authenticatedAt) || !isIsoDate(value.expiresAt)) {
    throw new Error("Native auth record timestamps are invalid");
  }
  if (value.session !== null && !isRecord(value.session)) {
    throw new Error("Native auth record session is invalid");
  }
}

export function serializeNativeAuthRecord(record: NativeAuthRecord): string {
  assertNativeAuthRecord(record);
  return JSON.stringify(record);
}

export function parseNativeAuthRecord(serialized: string): NativeAuthRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("Native auth record JSON is invalid");
  }
  assertNativeAuthRecord(parsed);
  return parsed;
}
