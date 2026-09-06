import type { CorsOptions } from "cors";

export class OriginNotAllowedError extends Error {
  readonly status = 403;

  constructor(origin: string) {
    super(`Origin ${origin} is not allowed by CORS`);
    this.name = "OriginNotAllowedError";
  }
}

const DEFAULT_DEV_ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  // Capacitor Android 8 uses https://localhost by default. Older Capacitor
  // builds and iOS may use one of the other native WebView origins.
  "https://localhost",
  "capacitor://localhost",
  "http://localhost",
];

const NATIVE_APP_ALLOWED_ORIGINS = [
  "https://localhost",
  "capacitor://localhost",
  "http://localhost",
] as const;

export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAllowedOrigins(env: NodeJS.ProcessEnv): string[] {
  const configuredOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);

  if (configuredOrigins.length > 0) {
    return Array.from(new Set([...configuredOrigins, ...NATIVE_APP_ALLOWED_ORIGINS]));
  }

  return env.NODE_ENV === "production" ? [] : DEFAULT_DEV_ALLOWED_ORIGINS;
}

function escapeRegex(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

function buildOriginPattern(originPattern: string): RegExp {
  return new RegExp(`^${escapeRegex(originPattern).replace(/\*/g, ".*")}$`);
}

export function isOriginAllowed(origin: string | undefined, allowedOrigins: readonly string[]): boolean {
  if (!origin) {
    return true;
  }

  return allowedOrigins.some((pattern) => buildOriginPattern(pattern).test(origin));
}

export function createCorsOptions(allowedOrigins: readonly string[]): CorsOptions {
  return {
    allowedHeaders: ["Authorization", "Content-Type", "X-CSRF-Token", "X-Transport-Key"],
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isOriginAllowed(origin, allowedOrigins)) {
        callback(null, origin);
        return;
      }

      callback(new OriginNotAllowedError(origin));
    },
  };
}

