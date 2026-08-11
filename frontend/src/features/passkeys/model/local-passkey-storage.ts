import {
  getOfflineAuthEnvelopeSnapshot,
  updateOfflineAuthEnvelope,
} from "@/entities/user/model/offline-auth-envelope";
import type { StoredLocalPasskey } from "@/features/passkeys/lib/local-unlock";

export const LOCAL_PASSKEY_STORAGE_KEY = "meatlens-local-passkey";
export const OFFLINE_UNLOCK_REQUIRED_STORAGE_KEY = "meatlens-auth-offline-lock-required";

function clonePasskey(passkey: StoredLocalPasskey): StoredLocalPasskey {
  return JSON.parse(JSON.stringify(passkey)) as StoredLocalPasskey;
}

export function getStoredLocalPasskey(): StoredLocalPasskey | null {
  const snapshot = getOfflineAuthEnvelopeSnapshot();
  return snapshot?.localPasskey ? clonePasskey(snapshot.localPasskey) : null;
}

export function getLegacyStoredLocalPasskey(): StoredLocalPasskey | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LOCAL_PASSKEY_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredLocalPasskey>;
    if (
      typeof parsed.credentialId !== "string" ||
      typeof parsed.publicKey !== "string" ||
      typeof parsed.publicKeyAlgorithm !== "number" ||
      typeof parsed.deviceLabel !== "string" ||
      typeof parsed.rpId !== "string"
    ) {
      return null;
    }

    return {
      credentialId: parsed.credentialId,
      publicKey: parsed.publicKey,
      publicKeyAlgorithm: parsed.publicKeyAlgorithm,
      transports: Array.isArray(parsed.transports) ? parsed.transports as AuthenticatorTransport[] : [],
      deviceLabel: parsed.deviceLabel,
      rpId: parsed.rpId,
      counter: typeof parsed.counter === "number" ? parsed.counter : 0,
      isAdmin: Boolean(parsed.isAdmin),
    };
  } catch {
    return null;
  }
}

export async function storeLocalPasskey(passkey: StoredLocalPasskey): Promise<void> {
  await updateOfflineAuthEnvelope((currentEnvelope) => {
    if (!currentEnvelope) return currentEnvelope;
    return { ...currentEnvelope, localPasskey: clonePasskey(passkey) };
  });
  clearLegacyStoredLocalPasskey();
}

export async function clearStoredLocalPasskey(credentialId?: string): Promise<void> {
  await updateOfflineAuthEnvelope((currentEnvelope) => {
    if (!currentEnvelope?.localPasskey) return currentEnvelope;
    if (credentialId && currentEnvelope.localPasskey.credentialId !== credentialId) return currentEnvelope;
    return { ...currentEnvelope, localPasskey: null };
  });
  clearLegacyStoredLocalPasskey(credentialId);
}

export function clearLegacyStoredLocalPasskey(credentialId?: string): void {
  if (typeof window === "undefined") return;
  if (!credentialId) {
    window.localStorage.removeItem(LOCAL_PASSKEY_STORAGE_KEY);
    return;
  }
  const storedPasskey = getLegacyStoredLocalPasskey();
  if (storedPasskey?.credentialId === credentialId) {
    window.localStorage.removeItem(LOCAL_PASSKEY_STORAGE_KEY);
  }
}

export function isOfflineUnlockRequired(): boolean {
  return Boolean(getOfflineAuthEnvelopeSnapshot()?.offlineUnlockRequired);
}

export function setOfflineUnlockRequired(required: boolean): void {
  void updateOfflineAuthEnvelope((currentEnvelope) => {
    if (!currentEnvelope) return currentEnvelope;
    return { ...currentEnvelope, offlineUnlockRequired: required };
  });
  clearLegacyOfflineUnlockRequired();
}

export function getLegacyOfflineUnlockRequired(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(OFFLINE_UNLOCK_REQUIRED_STORAGE_KEY) === "true";
}

export function clearLegacyOfflineUnlockRequired(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(OFFLINE_UNLOCK_REQUIRED_STORAGE_KEY);
}
