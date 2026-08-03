import { Capacitor } from "@capacitor/core";

const DEFAULT_WEB_API_BASE_URL = "http://localhost:3001/api";
const DEFAULT_NATIVE_API_BASE_URL = "https://meatlens-backend.onrender.com/api";

function normalizeApiBaseUrl(value: string | undefined): string {
  return value?.trim().replace(/^['"]|['"]$/g, "") ?? "";
}

function isLocalhostApiBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function resolveApiBaseUrl({
  envApiBaseUrl,
  isNativePlatform,
}: {
  envApiBaseUrl?: string;
  isNativePlatform?: boolean;
} = {}): string {
  const normalizedEnvApiBaseUrl = normalizeApiBaseUrl(envApiBaseUrl);

  if (!normalizedEnvApiBaseUrl) {
    return isNativePlatform ? DEFAULT_NATIVE_API_BASE_URL : DEFAULT_WEB_API_BASE_URL;
  }

  if (isNativePlatform && isLocalhostApiBaseUrl(normalizedEnvApiBaseUrl)) {
    return DEFAULT_NATIVE_API_BASE_URL;
  }

  return normalizedEnvApiBaseUrl;
}

export const API_BASE_URL = resolveApiBaseUrl({
  envApiBaseUrl: (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL,
  isNativePlatform: Capacitor.isNativePlatform(),
});
