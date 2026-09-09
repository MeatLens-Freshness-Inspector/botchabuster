import {
  isNativeRecordExpired,
  restoreOfflineEnvelopeFromNativeRecord,
} from "./native-envelope";
import type { OfflineAuthEnvelope } from "@/entities/user/model/offline-auth-envelope";
import type { NativeAuthRecord } from "./native-auth-record";

export function restoreNativeOfflineSession(
  record: NativeAuthRecord,
  nowMs = Date.now(),
): OfflineAuthEnvelope {
  if (isNativeRecordExpired(record, nowMs)) {
    throw new Error("Offline biometric session has expired");
  }
  return restoreOfflineEnvelopeFromNativeRecord(record);
}
