import type { AuthBootstrapPayload } from "@/features/auth";
import type { AuthMode, AuthSession, AuthUser } from "@/entities/user";
import { nativeBiometricAdapter } from "../api/native-biometric-factory";
import {
  createNativeAuthVault,
  type NativeAuthVault,
} from "../api/native-auth-vault";
import { restoreNativeOnlineSession } from "./native-online-restore";
import type { OfflineAuthEnvelope } from "@/entities/user/model/offline-auth-envelope";
import {
  enrollNativeBiometricSession,
  signInWithNativeBiometricSession,
  type NativeProviderActionDependencies,
} from "./native-provider-actions";

export const nativeAuthVault = createNativeAuthVault({
  authenticate: (reason) => nativeBiometricAdapter.authenticate(reason),
  readRecord: () => nativeBiometricAdapter.readRecord(),
  writeRecord: (record) => nativeBiometricAdapter.writeRecord(record),
  clearRecord: () => nativeBiometricAdapter.clearRecord(),
});

export interface NativeAuthActionDependencies {
  vault: NativeAuthVault;
  user: AuthUser | null;
  session: AuthSession | null;
  authMode: AuthMode;
  isOnline: () => boolean;
  loadEnvelope: () => Promise<OfflineAuthEnvelope | null>;
  setSession: (user: AuthUser, session: AuthSession) => void;
  getSession: () => Promise<AuthBootstrapPayload>;
  clearSession: () => void;
  unlockOffline: (envelope: OfflineAuthEnvelope) => Promise<OfflineAuthEnvelope>;
  applyOnline: (payload: AuthBootstrapPayload) => Promise<void>;
  setEnrolled: (enrolled: boolean) => void;
}

export function createNativeAuthActions(dependencies: NativeAuthActionDependencies) {
  const createProviderDependencies = (): NativeProviderActionDependencies => ({
    vault: dependencies.vault,
    isOnline: dependencies.isOnline,
    loadEnvelope: dependencies.loadEnvelope,
    restoreOnline: (record) => restoreNativeOnlineSession(record, {
      setSession: (session) => dependencies.setSession(record.offlineEnvelope.user, session),
      getSession: dependencies.getSession,
      clearSession: dependencies.clearSession,
    }),
    unlockOffline: dependencies.unlockOffline,
    applyOnline: dependencies.applyOnline,
  });

  return {
    enableNativeBiometricLogin: async () => {
      if (!dependencies.user || !dependencies.session || dependencies.authMode !== "online-authenticated") {
        throw new Error("Native biometric enrollment requires an online session");
      }

      await enrollNativeBiometricSession(
        { userId: dependencies.user.id, session: dependencies.session },
        createProviderDependencies(),
      );
      dependencies.setEnrolled(true);
    },
    disableNativeBiometricLogin: async () => {
      await dependencies.vault.clear();
      dependencies.setEnrolled(false);
    },
    signInWithNativeBiometric: async () => {
      try {
        const result = await signInWithNativeBiometricSession(
          createProviderDependencies(),
        );
        return { isAdmin: result.isAdmin };
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          (error as { code?: string }).code === "vault-corrupt"
        ) {
          await dependencies.vault.clearAfterCorruption();
          dependencies.setEnrolled(false);
        }
        throw error;
      }
    },
  };
}
