import type { AuthBootstrapPayload } from "@/features/auth/api/auth-client";
import type { AuthSession } from "@/entities/user/model/session-types";
import type { NativeAuthRecord } from "./native-auth-record";

export interface NativeOnlineRestoreDependencies {
  setSession: (session: AuthSession) => void;
  getSession: () => Promise<AuthBootstrapPayload>;
  clearSession: () => void;
}

export type NativeOnlineRestoreResult =
  | { status: "online"; payload: AuthBootstrapPayload }
  | { status: "expired" };

export async function restoreNativeOnlineSession(
  record: NativeAuthRecord,
  dependencies: NativeOnlineRestoreDependencies,
  nowMs = Date.now(),
): Promise<NativeOnlineRestoreResult> {
  const session = record.session;
  if (!session?.access_token || (session.expires_at !== null && session.expires_at <= Math.floor(nowMs / 1000))) {
    return { status: "expired" };
  }

  dependencies.setSession(session);
  try {
    const payload = await dependencies.getSession();
    return { status: "online", payload };
  } catch {
    dependencies.clearSession();
    return { status: "expired" };
  }
}
