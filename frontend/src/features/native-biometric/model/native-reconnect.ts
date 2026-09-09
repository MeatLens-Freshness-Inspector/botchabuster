import type { AuthMode } from "@/entities/user/model/session-types";
import type { NativeAuthRecord } from "./native-auth-record";

export interface NativeReconnectDependencies {
  isOnline: () => boolean;
  restoreOnline: () => Promise<{ status: "online"; payload: unknown } | { status: "expired" }>;
  restoreOffline: () => { status: "offline"; envelope: unknown };
}

export type NativeReconnectResult =
  | { status: "ignored" }
  | { status: "online"; payload: unknown }
  | { status: "offline"; envelope: unknown };

export async function restoreNativeOnReconnect(
  authMode: AuthMode,
  _record: NativeAuthRecord,
  dependencies: NativeReconnectDependencies,
): Promise<NativeReconnectResult> {
  if (authMode !== "offline-authenticated" && authMode !== "offline-locked") {
    return { status: "ignored" };
  }

  if (dependencies.isOnline()) {
    const online = await dependencies.restoreOnline();
    if (online.status === "online") {
      return online;
    }
  }

  return dependencies.restoreOffline();
}
