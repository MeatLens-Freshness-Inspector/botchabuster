import type { AuthBootstrapPayload } from "@/features/auth/api/auth-client";
import {
  assertNativeAuthRecord,
  type NativeAuthRecord,
} from "@/features/native-biometric/model/native-auth-record";
import type { OfflineAuthEnvelope } from "./offline-auth-envelope";

export function createNativeAuthRecordFromBootstrap(
  payload: AuthBootstrapPayload,
  offlineEnvelope: OfflineAuthEnvelope,
): NativeAuthRecord {
  const record: NativeAuthRecord = {
    version: 1,
    userId: payload.user.id,
    session: payload.session,
    offlineEnvelope,
    authenticatedAt: payload.authenticatedAt,
    expiresAt: payload.offlineExpiresAt,
  };
  assertNativeAuthRecord(record);
  return record;
}

export function isNativeRecordExpired(record: NativeAuthRecord, nowMs = Date.now()): boolean {
  return Date.parse(record.expiresAt) <= nowMs || Date.parse(record.offlineEnvelope.offlineExpiresAt) <= nowMs;
}

export function restoreOfflineEnvelopeFromNativeRecord(
  record: NativeAuthRecord,
): OfflineAuthEnvelope {
  assertNativeAuthRecord(record);
  return {
    ...record.offlineEnvelope,
    offlineUnlockRequired: false,
  };
}
