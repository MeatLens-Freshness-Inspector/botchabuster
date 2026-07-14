import type { CorsOptions } from "cors";

const DEFAULT_DEV_ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  // Capacitor Android/iOS WebViews use these origins.
  // Also add these to ALLOWED_ORIGINS in the Render environment for production.
  "capacitor://localhost",
  "http://localhost",
];

export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAllowedOrigins(env: NodeJS.ProcessEnv): string[] {
  const configuredOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
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
    allowedHeaders: ["Authorization", "Content-Type", "X-CSRF-Token"],
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

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
  };
}

