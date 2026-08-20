import type { BackendEnvironment } from "./env";

export interface AppConfig extends BackendEnvironment {
  uploadDir: string;
  maxFileSize: number;
  developerOptionsPassword: string;
  developerOptionsTokenSecret: string;
  developerOptionsTokenTtlSeconds: number;
  appSessionCookieName: string;
  appSessionCookieSecureConfigured: boolean;
  appSessionCookieSecure: boolean;
  csrfTokenSecret: string;
  csrfTokenTtlSeconds: number;
  sessionIdleTimeoutSeconds: number;
  sessionCleanupIntervalMs: number;
}

export interface SessionTimingConfig {
  sessionIdleTimeoutSeconds: number;
  sessionCleanupIntervalMs: number;
}

function parseOptionalBoolean(value: string | undefined): boolean | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
}

function parseMinimumInteger(value: string | undefined, fallback: number, minimum: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) ? Math.max(minimum, parsed) : fallback;
}

export function createAppConfig(
  environment: BackendEnvironment,
  overrides: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const secureOverride = parseOptionalBoolean(overrides.APP_SESSION_COOKIE_SECURE);
  const developerOptionsPassword = overrides.DEVELOPER_OPTIONS_PASSWORD?.trim() ?? "";

  return {
    ...environment,
    uploadDir: overrides.UPLOAD_DIR?.trim() || "./uploads",
    maxFileSize: 10 * 1024 * 1024,
    developerOptionsPassword,
    developerOptionsTokenSecret: overrides.DEVELOPER_OPTIONS_TOKEN_SECRET?.trim() || developerOptionsPassword,
    developerOptionsTokenTtlSeconds: parseMinimumInteger(
      overrides.DEVELOPER_OPTIONS_TOKEN_TTL_SECONDS,
      21_600,
      60,
    ),
    appSessionCookieName: overrides.APP_SESSION_COOKIE_NAME?.trim() || "meatlens_session",
    appSessionCookieSecureConfigured: secureOverride !== null,
    appSessionCookieSecure: secureOverride ?? overrides.NODE_ENV === "production",
    csrfTokenSecret: overrides.CSRF_TOKEN_SECRET?.trim() || environment.appSessionSecret,
    csrfTokenTtlSeconds: parseMinimumInteger(overrides.CSRF_TOKEN_TTL_SECONDS, 900, 60),
    ...resolveSessionTiming(overrides),
  };
}

export function resolveSessionTiming(overrides: NodeJS.ProcessEnv = process.env): SessionTimingConfig {
  const sessionIdleTimeoutSeconds = parseMinimumInteger(
    overrides.SESSION_IDLE_TIMEOUT_SECONDS,
    900,
    60,
  );
  const cleanupIntervalSeconds = parseMinimumInteger(
    overrides.SESSION_CLEANUP_INTERVAL_SECONDS,
    900,
    300,
  );
  const safeCleanupIntervalSeconds = Math.min(cleanupIntervalSeconds, 2_147_483);

  return {
    sessionIdleTimeoutSeconds,
    sessionCleanupIntervalMs: safeCleanupIntervalSeconds * 1000,
  };
}
