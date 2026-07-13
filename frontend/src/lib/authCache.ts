import type { AuthSession, AuthUser } from "@/integrations/api/AuthClient";
import type { Profile } from "@/integrations/api/ProfileClient";

export const USER_STORAGE_KEY = "meatlens-auth-user";
export const SESSION_STORAGE_KEY = "meatlens-auth-session";
const PROFILE_STORAGE_KEY = "meatlens-auth-profile";
const ADMIN_STORAGE_KEY = "meatlens-auth-admin";

interface CachedAdminState {
  userId: string;
  isAdmin: boolean;
}

function readJson<T>(storage: Storage, storageKey: string): T | null {
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readLocalJson<T>(storageKey: string): T | null {
  if (typeof window === "undefined") return null;
  return readJson<T>(window.localStorage, storageKey);
}

function readSessionJson<T>(storageKey: string): T | null {
  if (typeof window === "undefined") return null;
  return readJson<T>(window.sessionStorage, storageKey);
}

function clearStoredSession(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage access failures and continue clearing legacy state.
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

function migrateLegacySession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  const rawLegacySession = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!rawLegacySession) return null;

  try {
    const legacySession = JSON.parse(rawLegacySession) as AuthSession;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(legacySession));
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return legacySession;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function getCachedAuthUser(): AuthUser | null {
  const user = readLocalJson<AuthUser>(USER_STORAGE_KEY);
  return user?.id ? user : null;
}

export function getCachedAuthSession(): AuthSession | null {
  const session = readSessionJson<AuthSession>(SESSION_STORAGE_KEY);
  if (session) {
    return session;
  }

  return migrateLegacySession();
}

export function getCachedAccessToken(): string | null {
  return getCachedAuthSession()?.access_token ?? null;
}

export function createAuthHeaders(initialHeaders?: HeadersInit): Headers {
  const headers = new Headers(initialHeaders);
  const accessToken = getCachedAccessToken();

  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

export function setCachedAuth(user: AuthUser, session: AuthSession | null): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

  if (session) {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  clearStoredSession();
}

export function clearCachedAuth(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(USER_STORAGE_KEY);
  clearStoredSession();
}

export function getCachedProfile(userId: string): Profile | null {
  const profile = readLocalJson<Profile>(PROFILE_STORAGE_KEY);
  return profile?.id === userId ? profile : null;
}

export function setCachedProfile(profile: Profile | null): void {
  if (typeof window === "undefined") return;

  if (profile) {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return;
  }

  window.localStorage.removeItem(PROFILE_STORAGE_KEY);
}

export function clearCachedProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_STORAGE_KEY);
}

export function getCachedAdmin(userId: string): boolean | null {
  const cachedAdmin = readLocalJson<CachedAdminState>(ADMIN_STORAGE_KEY);
  if (!cachedAdmin || cachedAdmin.userId !== userId) {
    return null;
  }

  return cachedAdmin.isAdmin;
}

export function setCachedAdmin(userId: string, isAdmin: boolean): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({
    userId,
    isAdmin,
  } satisfies CachedAdminState));
}

export function clearCachedAdmin(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_STORAGE_KEY);
}
