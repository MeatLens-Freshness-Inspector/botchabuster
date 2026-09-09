import type {
  NativeBiometricAdapter,
  NativeBiometricError,
} from "../model/native-biometric-types";

function unavailableError(): NativeBiometricError {
  const error = new Error("Native biometric authentication is unavailable in the browser") as NativeBiometricError;
  error.name = "NativeBiometricUnavailableError";
  error.code = "unavailable";
  error.retryable = true;
  return error;
}

export function createBrowserNativeBiometricAdapter(): NativeBiometricAdapter {
  return {
    async checkAvailability() {
      return {
        isNative: false,
        isAvailable: false,
        isEnrolled: false,
        label: "unavailable" as const,
      };
    },
    async hasRecord() {
      return false;
    },
    async authenticate() {
      throw unavailableError();
    },
    async readRecord() {
      throw unavailableError();
    },
    async writeRecord() {
      throw unavailableError();
    },
    async clearRecord() {
      throw unavailableError();
    },
  };
}
