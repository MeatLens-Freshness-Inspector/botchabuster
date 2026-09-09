import { Capacitor } from "@capacitor/core";
import type { NativeBiometricAdapter } from "../model/native-biometric-types";
import { createBrowserNativeBiometricAdapter } from "./browser-native-biometric";
import { createCapacitorNativeBiometricAdapter } from "./capacitor-native-biometric";

export function getNativeBiometricAdapter(): NativeBiometricAdapter {
  return Capacitor.isNativePlatform()
    ? createCapacitorNativeBiometricAdapter()
    : createBrowserNativeBiometricAdapter();
}

export const nativeBiometricAdapter = getNativeBiometricAdapter();
