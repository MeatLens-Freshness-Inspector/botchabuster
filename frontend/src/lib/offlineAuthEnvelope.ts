import type { AuthPrimaryRole, AuthRole, AuthUser } from "@/integrations/api/AuthClient";
import type { Profile } from "@/integrations/api/ProfileClient";
import type { PasswordVerifierRecord } from "@/lib/offlineCredentials";
import type { StoredLocalPasskey } from "@/lib/passkeys/localUnlock";

const DB_NAME = "meatlens-offline-auth";
const DB_VERSION = 1;
const STORE_NAME = "auth-envelope";
const ENVELOPE_KEY = "current";

export interface OfflineAuthEnvelope {
  user: AuthUser;
  profile: Profile;
  roles: AuthRole[];
  primaryRole: AuthPrimaryRole;
  isAdmin: boolean;
  isDeveloper: boolean;
  authenticatedAt: string;
  offlineExpiresAt: string;
  offlineUnlockRequired: boolean;
  passwordVerifier: PasswordVerifierRecord | null;
  localPasskey: StoredLocalPasskey | null;
}

type StoredEnvelopeRecord = Partial<OfflineAuthEnvelope> & {
  key: typeof ENVELOPE_KEY;
};

let offlineAuthEnvelopeSnapshot: OfflineAuthEnvelope | null = null;

function cloneEnvelope<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function isAuthRole(value: unknown): value is AuthRole {
  return value === "developer" || value === "admin" || value === "moderator" || value === "user";
}

function normalizeStoredEnvelope(record: Partial<OfflineAuthEnvelope> | undefined): OfflineAuthEnvelope | null {
  if (!record?.user || !record.profile || !record.authenticatedAt || !record.offlineExpiresAt) {
    return null;
  }

  const storedRoles = Array.isArray(record.roles)
    ? record.roles.filter(isAuthRole)
    : [];
  const isDeveloper = Boolean(record.isDeveloper) || storedRoles.includes("developer");
  const isAdmin = isDeveloper || Boolean(record.isAdmin) || storedRoles.includes("admin");
  const primaryRole: AuthPrimaryRole =
    record.primaryRole === "developer" || record.primaryRole === "admin"
      ? record.primaryRole
      : isDeveloper
        ? "developer"
        : isAdmin
          ? "admin"
          : "inspector";
  const roles = storedRoles.length > 0
    ? storedRoles
    : isDeveloper
      ? ["developer"]
      : isAdmin
        ? ["admin"]
        : [];

  return {
    user: record.user,
    profile: record.profile,
    roles,
    primaryRole,
    isAdmin,
    isDeveloper,
    authenticatedAt: record.authenticatedAt,
    offlineExpiresAt: record.offlineExpiresAt,
    offlineUnlockRequired: Boolean(record.offlineUnlockRequired),
    passwordVerifier: record.passwordVerifier ?? null,
    localPasskey: record.localPasskey ?? null,
  };
}

function openDb(): Promise<IDBDatabase | null> {
  if (!canUseIndexedDb()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getOfflineAuthEnvelopeSnapshot(): OfflineAuthEnvelope | null {
  return offlineAuthEnvelopeSnapshot ? cloneEnvelope(offlineAuthEnvelopeSnapshot) : null;
}

export async function loadOfflineAuthEnvelope(): Promise<OfflineAuthEnvelope | null> {
  const db = await openDb();
  if (!db) {
    return getOfflineAuthEnvelopeSnapshot();
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(ENVELOPE_KEY);

    request.onsuccess = () => {
      const record = request.result as StoredEnvelopeRecord | undefined;
      const normalizedRecord = normalizeStoredEnvelope(record);
      offlineAuthEnvelopeSnapshot = normalizedRecord ? cloneEnvelope(normalizedRecord) : null;
      resolve(getOfflineAuthEnvelopeSnapshot());
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveOfflineAuthEnvelope(envelope: OfflineAuthEnvelope): Promise<void> {
  offlineAuthEnvelopeSnapshot = cloneEnvelope(envelope);

  const db = await openDb();
  if (!db) {
    return;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      key: ENVELOPE_KEY,
      ...cloneEnvelope(envelope),
    } satisfies OfflineAuthEnvelope & { key: typeof ENVELOPE_KEY });

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearOfflineAuthEnvelope(): Promise<void> {
  offlineAuthEnvelopeSnapshot = null;

  const db = await openDb();
  if (!db) {
    return;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(ENVELOPE_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateOfflineAuthEnvelope(
  update: (currentEnvelope: OfflineAuthEnvelope | null) => OfflineAuthEnvelope | null,
): Promise<OfflineAuthEnvelope | null> {
  const currentEnvelope = await loadOfflineAuthEnvelope();
  const nextEnvelope = update(currentEnvelope);

  if (!nextEnvelope) {
    await clearOfflineAuthEnvelope();
    return null;
  }

  await saveOfflineAuthEnvelope(nextEnvelope);
  return getOfflineAuthEnvelopeSnapshot();
}

export function isOfflineAuthExpired(
  envelope: Pick<OfflineAuthEnvelope, "offlineExpiresAt">,
  nowMs = Date.now(),
): boolean {
  return Date.parse(envelope.offlineExpiresAt) <= nowMs;
}
