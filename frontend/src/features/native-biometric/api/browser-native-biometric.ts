import type {
  NativeBiometricAdapter,
} from "../model/native-biometric-types";
import { createNativeBiometricError } from "../model/native-biometric-errors";

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
      throw createNativeBiometricError(
        "unavailable",
        "Native biometric authentication is unavailable in the browser",
        true,
      );
    },
    async readRecord() {
      throw createNativeBiometricError(
        "unavailable",
        "Native biometric authentication is unavailable in the browser",
        true,
      );
    },
    async writeRecord() {
      throw createNativeBiometricError(
        "unavailable",
        "Native biometric authentication is unavailable in the browser",
        true,
      );
    },
    async clearRecord() {
      throw createNativeBiometricError(
        "unavailable",
        "Native biometric authentication is unavailable in the browser",
        true,
      );
    },
  };
}
