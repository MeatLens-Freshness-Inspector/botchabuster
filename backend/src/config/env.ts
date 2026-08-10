import { ValidationError } from "../shared/domain/errors/ApplicationError";

export interface BackendEnvironment {
  port: number;
  supabaseUrl: string;
  supabaseServiceKey: string;
  supabasePublishableKey: string;
  appSessionSecret: string;
  allowedOrigins: string[];
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim() ?? "";
  if (!value) {
    throw new ValidationError(`${name} must be configured`);
  }

  return value;
}

function parsePort(value: string | undefined): number {
  if (!value?.trim()) return 3001;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new ValidationError("PORT must be an integer between 1 and 65535");
  }

  return port;
}

export function parseEnvironment(env: NodeJS.ProcessEnv): BackendEnvironment {
  const serviceKey = env.SUPABASE_SERVICE_KEY?.trim() || env.SUPABASE_KEY?.trim() || "";
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY?.trim() || env.SUPABASE_ANON_KEY?.trim() || "";

  if (!serviceKey) throw new ValidationError("SUPABASE_SERVICE_KEY must be configured");
  if (!publishableKey) throw new ValidationError("SUPABASE_PUBLISHABLE_KEY must be configured");

  return {
    port: parsePort(env.PORT),
    supabaseUrl: required(env, "SUPABASE_URL"),
    supabaseServiceKey: serviceKey,
    supabasePublishableKey: publishableKey,
    appSessionSecret: required(env, "APP_SESSION_SECRET"),
    allowedOrigins: (env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}
