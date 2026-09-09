import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { KeychainAccess, SecureStorage } from "@aparajita/capacitor-secure-storage";
import type {
  NativeBiometricAdapter,
  NativeBiometricAvailability,
} from "../model/native-biometric-types";

const RECORD_KEY = "auth-record";

interface BiometryInfo {
  isAvailable: boolean;
  deviceIsSecure: boolean;
  biometryType?: string;
}

interface CapacitorNativeBiometricDependencies {
  checkBiometry: () => Promise<BiometryInfo>;
  authenticate: (options: {
    reason: string;
    allowDeviceCredential: boolean;
    androidTitle: string;
  }) => Promise<void>;
  get: (key: string) => Promise<unknown | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<boolean>;
}

function getBiometryLabel(type: string | undefined): NativeBiometricAvailability["label"] {
  if (type === "touchId" || type === "fingerprintAuthentication") {
    return "fingerprint";
  }
  if (type === "faceId" || type === "faceAuthentication") {
    return "face";
  }
  return type && type !== "none" ? "biometric" : "unavailable";
}

function createDefaultDependencies(): CapacitorNativeBiometricDependencies {
  return {
    checkBiometry: () => BiometricAuth.checkBiometry(),
    authenticate: (options) => BiometricAuth.authenticate(options),
    get: async (key) => SecureStorage.get(key, false, false),
    set: (key, value) => SecureStorage.set(
      key,
      value,
      false,
      false,
      KeychainAccess.whenPasscodeSetThisDeviceOnly,
    ),
    remove: (key) => SecureStorage.remove(key, false),
  };
}

export function createCapacitorNativeBiometricAdapter(
  dependencies: CapacitorNativeBiometricDependencies = createDefaultDependencies(),
): NativeBiometricAdapter {
  return {
    async checkAvailability() {
      const info = await dependencies.checkBiometry();
      return {
        isNative: true,
        isAvailable: info.isAvailable,
        isEnrolled: info.isAvailable && info.deviceIsSecure,
        label: getBiometryLabel(info.biometryType),
      };
    },
    async hasRecord() {
      return Boolean(await dependencies.get(RECORD_KEY));
    },
    async authenticate(reason) {
      await dependencies.authenticate({
        reason: reason === "enroll"
          ? "Enable biometric login for MeatLens"
          : "Authenticate to access MeatLens",
        allowDeviceCredential: true,
        androidTitle: "MeatLens biometric login",
      });
    },
    async readRecord() {
      await this.authenticate("login");
      const value = await dependencies.get(RECORD_KEY);
      if (typeof value !== "string" || value.length === 0) {
        throw new Error("Native biometric record is missing");
      }
      return value;
    },
    async writeRecord(serializedRecord) {
      await dependencies.set(RECORD_KEY, serializedRecord);
    },
    async clearRecord() {
      await dependencies.remove(RECORD_KEY);
    },
  };
}
