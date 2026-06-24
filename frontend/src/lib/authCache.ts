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

function readJson<T>(storageKey: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getCachedAuthUser(): AuthUser | null {
  const user = readJson<AuthUser>(USER_STORAGE_KEY);
  return user?.id ? user : null;
}

export function getCachedAuthSession(): AuthSession | null {
  return readJson<AuthSession>(SESSION_STORAGE_KEY);
}

export function setCachedAuth(user: AuthUser, session: AuthSession | null): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

  if (session) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function clearCachedAuth(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getCachedProfile(userId: string): Profile | null {
  const profile = readJson<Profile>(PROFILE_STORAGE_KEY);
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
  const cachedAdmin = readJson<CachedAdminState>(ADMIN_STORAGE_KEY);
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
