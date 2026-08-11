import { readJson } from "@/shared/lib/storage";

const SESSION_STORAGE_KEY = "meatlens-auth-session";

type CachedSession = {
  access_token?: string | null;
};

function getCachedAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  const session = readJson<CachedSession>(window.sessionStorage, SESSION_STORAGE_KEY);
  if (session?.access_token) return session.access_token;

  const legacySession = readJson<CachedSession>(window.localStorage, SESSION_STORAGE_KEY);
  return legacySession?.access_token ?? null;
}

export function createAuthHeaders(initialHeaders?: HeadersInit): Headers {
  const headers = new Headers(initialHeaders);
  const accessToken = getCachedAccessToken();

  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}
