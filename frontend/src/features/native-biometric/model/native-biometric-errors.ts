import type {
  NativeBiometricError,
  NativeBiometricErrorCode,
} from "./native-biometric-types";

type NativePluginError = { code?: unknown; message?: unknown };

export function createNativeBiometricError(
  code: NativeBiometricErrorCode,
  message: string,
  retryable: boolean,
): NativeBiometricError {
  const error = new Error(message) as NativeBiometricError;
  error.name = "NativeBiometricError";
  error.code = code;
  error.retryable = retryable;
  return error;
}

export function normalizeNativeBiometricError(error: unknown): NativeBiometricError {
  if (error instanceof Error && "code" in error && "retryable" in error) {
    return error as NativeBiometricError;
  }

  const pluginCode = typeof error === "object" && error !== null
    ? (error as NativePluginError).code
    : undefined;

  if (pluginCode === "userCancel" || pluginCode === "systemCancel" || pluginCode === "appCancel") {
    return createNativeBiometricError("cancelled", "Biometric authentication was cancelled.", true);
  }
  if (pluginCode === "biometryLockout") {
    return createNativeBiometricError("locked-out", "Biometric authentication is temporarily locked.", false);
  }
  if (pluginCode === "biometryNotEnrolled") {
    return createNativeBiometricError("not-enrolled", "No biometric credential is enrolled on this device.", true);
  }
  if (pluginCode === "biometryNotAvailable" || pluginCode === "passcodeNotSet" || pluginCode === "noDeviceCredential") {
    return createNativeBiometricError("unavailable", "Device biometrics are unavailable.", true);
  }
  if (error instanceof SyntaxError) {
    return createNativeBiometricError("vault-corrupt", "The native biometric record is invalid.", true);
  }
  if (pluginCode === "notFound") {
    return createNativeBiometricError("vault-missing", "No native biometric record is enrolled.", true);
  }

  return createNativeBiometricError(
    "storage-failed",
    "Native biometric authentication failed.",
    true,
  );
}

export function getNativeBiometricMessage(
  error: unknown,
  action: "login" | "unlock" | "enroll",
): string {
  const normalized = normalizeNativeBiometricError(error);
  switch (normalized.code) {
    case "cancelled":
      return "Biometric authentication was cancelled.";
    case "locked-out":
      return "Biometrics are temporarily locked. Use your password or passkey instead.";
    case "not-enrolled":
      return "Enroll a device biometric before using biometric login.";
    case "vault-missing":
      return "Biometric login is not enrolled on this device.";
    case "vault-corrupt":
      return "Your biometric login needs to be set up again after a fresh online sign-in.";
    case "unavailable":
      return "Device biometrics are unavailable. Use your password or passkey instead.";
    case "storage-failed":
      return action === "enroll"
        ? "Biometric login could not be enabled. Try again or use your password or passkey."
        : "Biometric login could not be completed. Use your password or passkey instead.";
  }
}
