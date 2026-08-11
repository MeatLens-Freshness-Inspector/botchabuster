import { getHttpApiErrorStatus } from "@/shared/api";
import type { AuthMode } from "./session-types";
import type { OfflineAuthEnvelope } from "./offline-auth-envelope";

export interface RestoreSessionDependencies<BootstrapPayload> {
  isOnline: () => boolean;
  clearLegacyLiveAuthArtifacts: () => void;
  loadValidOfflineEnvelope: () => Promise<OfflineAuthEnvelope | null>;
  lockToOfflineEnvelope: (envelope: OfflineAuthEnvelope) => Promise<unknown>;
  clearInMemoryAuthState: (mode: AuthMode) => void;
  getSession: () => Promise<BootstrapPayload>;
  applyOnlineBootstrap: (payload: BootstrapPayload) => Promise<unknown>;
  reportBootstrapError?: (error: unknown) => void;
}

export async function restoreSession<BootstrapPayload>(
  dependencies: RestoreSessionDependencies<BootstrapPayload>,
): Promise<void> {
  dependencies.clearLegacyLiveAuthArtifacts();
  const validEnvelope = await dependencies.loadValidOfflineEnvelope();

  if (!dependencies.isOnline()) {
    if (validEnvelope) {
      await dependencies.lockToOfflineEnvelope(validEnvelope);
    } else {
      dependencies.clearInMemoryAuthState("anonymous");
    }
    return;
  }

  try {
    const payload = await dependencies.getSession();
    await dependencies.applyOnlineBootstrap(payload);
  } catch (error) {
    if (validEnvelope) {
      await dependencies.lockToOfflineEnvelope(validEnvelope);
    } else if (getHttpApiErrorStatus(error) === 401) {
      dependencies.clearInMemoryAuthState("anonymous");
    } else {
      dependencies.reportBootstrapError?.(error);
      dependencies.clearInMemoryAuthState("expired");
    }
  }
}
