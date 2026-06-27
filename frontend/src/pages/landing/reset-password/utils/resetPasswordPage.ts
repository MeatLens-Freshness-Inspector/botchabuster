import { consumeStoredRecoveryAccessToken } from "@/lib/authUrlHash";
import type { RecoverySessionState } from "../types";

export function resolveRecoverySession(hash: string): RecoverySessionState {
  const hashValue = hash.startsWith("#") ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(hashValue);
  const recoveryType = hashParams.get("type");
  const token = hashParams.get("access_token");
  const tokenFromStorage = consumeStoredRecoveryAccessToken();
  const resolvedToken = tokenFromStorage ?? token;

  if (recoveryType === "recovery" && resolvedToken) {
    return {
      isRecovery: true,
      accessToken: resolvedToken,
      shouldClearHash: true,
    };
  }

  if (!recoveryType && tokenFromStorage) {
    return {
      isRecovery: true,
      accessToken: tokenFromStorage,
      shouldClearHash: false,
    };
  }

  return {
    isRecovery: false,
    accessToken: "",
    shouldClearHash: false,
  };
}

export function getResetPasswordErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Failed to update password";
}
