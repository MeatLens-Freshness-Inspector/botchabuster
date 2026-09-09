import { KeychainAccess, SecureStorage } from "@aparajita/capacitor-secure-storage";
import { normalizeNativeBiometricError } from "../model/native-biometric-errors";

export interface NativeSecureStorageDependencies {
  setKeyPrefix: (prefix: string) => Promise<void>;
  setSynchronize: (sync: boolean) => Promise<void>;
  setDefaultKeychainAccess: (access: string) => Promise<void>;
  get: (key: string) => Promise<unknown | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<boolean>;
}

export interface NativeSecureStorage {
  configure(): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

function createDefaultDependencies(): NativeSecureStorageDependencies {
  return {
    setKeyPrefix: (prefix) => SecureStorage.setKeyPrefix(prefix),
    setSynchronize: (sync) => SecureStorage.setSynchronize(sync),
    setDefaultKeychainAccess: (access) => SecureStorage.setDefaultKeychainAccess(access as KeychainAccess),
    get: (key) => SecureStorage.get(key, false, false),
    set: (key, value) => SecureStorage.set(key, value, false, false, KeychainAccess.whenPasscodeSetThisDeviceOnly),
    remove: (key) => SecureStorage.remove(key, false),
  };
}

export function createNativeSecureStorage(
  dependencies: NativeSecureStorageDependencies = createDefaultDependencies(),
): NativeSecureStorage {
  return {
    async configure() {
      try {
        await dependencies.setKeyPrefix("meatlens_");
        await dependencies.setSynchronize(false);
        await dependencies.setDefaultKeychainAccess("whenPasscodeSetThisDeviceOnly");
      } catch (error) {
        throw normalizeNativeBiometricError(error);
      }
    },
    async get(key) {
      try {
        const value = await dependencies.get(key);
        if (value === null || value === undefined) return null;
        return typeof value === "string" ? value : JSON.stringify(value);
      } catch (error) {
        throw normalizeNativeBiometricError(error);
      }
    },
    async set(key, value) {
      try {
        await dependencies.set(key, value);
      } catch (error) {
        throw normalizeNativeBiometricError(error);
      }
    },
    async remove(key) {
      try {
        await dependencies.remove(key);
      } catch (error) {
        throw normalizeNativeBiometricError(error);
      }
    },
  };
}
