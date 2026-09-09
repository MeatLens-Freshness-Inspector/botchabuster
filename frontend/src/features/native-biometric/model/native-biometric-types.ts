import type { AuthSession } from "@/entities/user/model/session-types";
import type { OfflineAuthEnvelope } from "@/entities/user/model/offline-auth-envelope";

export const NATIVE_BIOMETRIC_ERROR_CODES = [
  "unavailable",
  "not-enrolled",
  "cancelled",
  "locked-out",
  "vault-missing",
  "vault-corrupt",
  "storage-failed",
] as const;

export type NativeBiometricErrorCode = (typeof NATIVE_BIOMETRIC_ERROR_CODES)[number];

export interface NativeBiometricAvailability {
  isNative: boolean;
  isAvailable: boolean;
  isEnrolled: boolean;
  label: "fingerprint" | "face" | "biometric" | "unavailable";
}

export interface NativeBiometricError extends Error {
  code: NativeBiometricErrorCode;
  retryable: boolean;
}

export interface NativeBiometricRecordInput {
  userId: string;
  session: AuthSession | null;
  offlineEnvelope: OfflineAuthEnvelope;
}

export interface NativeBiometricAdapter {
  checkAvailability(): Promise<NativeBiometricAvailability>;
  hasRecord(): Promise<boolean>;
  authenticate(reason: "enroll" | "login" | "unlock"): Promise<void>;
  readRecord(): Promise<string>;
  writeRecord(serializedRecord: string): Promise<void>;
  clearRecord(): Promise<void>;
}
