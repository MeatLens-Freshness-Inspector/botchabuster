import type { AuthBootstrapPayload } from "@/features/auth/api/auth-client";
import type { AuthSession } from "@/entities/user/model/session-types";
import type { OfflineAuthEnvelope } from "@/entities/user/model/offline-auth-envelope";
import {
  restoreNativeOfflineSession,
} from "./native-offline-restore";
import type { NativeAuthVault } from "../api/native-auth-vault";
import type { NativeAuthRecord } from "../model/native-auth-record";

export interface NativeProviderActionDependencies {
  vault: NativeAuthVault;
  isOnline: () => boolean;
  loadEnvelope: () => Promise<OfflineAuthEnvelope | null>;
  restoreOnline: (record: NativeAuthRecord) => Promise<{ status: "online"; payload: AuthBootstrapPayload } | { status: "expired" }>;
  unlockOffline: (envelope: OfflineAuthEnvelope) => Promise<OfflineAuthEnvelope>;
  applyOnline: (payload: AuthBootstrapPayload) => Promise<void>;
}

export async function enrollNativeBiometricSession(
  input: { userId: string; session: AuthSession | null },
  dependencies: NativeProviderActionDependencies,
): Promise<void> {
  if (!input.session) {
    throw new Error("Native biometric enrollment requires an online session");
  }
  const envelope = await dependencies.loadEnvelope();
  if (!envelope || envelope.user.id !== input.userId) {
    throw new Error("Native biometric enrollment requires a matching offline session");
  }
  await dependencies.vault.enroll({
    userId: input.userId,
    session: input.session,
    offlineEnvelope: envelope,
  });
}

export async function signInWithNativeBiometricSession(
  dependencies: NativeProviderActionDependencies,
): Promise<{ isAdmin: boolean; mode: "online" | "offline" }> {
  const record = await dependencies.vault.unlock(dependencies.isOnline() ? "login" : "unlock");

  if (dependencies.isOnline()) {
    const online = await dependencies.restoreOnline(record);
    if (online.status === "online") {
      await dependencies.applyOnline(online.payload);
      return { isAdmin: online.payload.isAdmin, mode: "online" };
    }
  }

  const envelope = restoreNativeOfflineSession(record);
  const unlocked = await dependencies.unlockOffline(envelope);
  return { isAdmin: unlocked.isAdmin, mode: "offline" };
}
