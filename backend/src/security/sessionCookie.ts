import type { Request } from "express";

interface SecureCookieInput {
  cookieSecureConfigured: boolean;
  cookieSecure: boolean;
  forwardedProto?: string | null;
  origin?: string | null;
  host?: string | null;
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().replace(/^\[|\]$/g, "").toLowerCase();
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function getForwardedProto(value: string | null | undefined): string | null {
  const forwardedProto = value
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  return forwardedProto || null;
}

function getOriginUrl(origin: string | null | undefined): URL | null {
  if (!origin?.trim()) {
    return null;
  }

  try {
    return new URL(origin);
  } catch {
    return null;
  }
}

function getHostHostname(host: string | null | undefined): string | null {
  if (!host?.trim()) {
    return null;
  }

  const normalizedHost = host.trim();

  if (normalizedHost.startsWith("[")) {
    const closingBracketIndex = normalizedHost.indexOf("]");
    if (closingBracketIndex > 0) {
      return normalizedHost.slice(1, closingBracketIndex);
    }
  }

  return normalizedHost.split(":")[0] || null;
}

export function shouldUseSecureSessionCookie(input: SecureCookieInput): boolean {
  if (input.cookieSecureConfigured) {
    return input.cookieSecure;
  }

  const forwardedProto = getForwardedProto(input.forwardedProto);
  if (forwardedProto) {
    return forwardedProto === "https";
  }

  const originUrl = getOriginUrl(input.origin);
  if (originUrl) {
    if (originUrl.protocol === "https:") {
      return true;
    }

    if (originUrl.protocol === "http:") {
      return !isLoopbackHostname(originUrl.hostname);
    }
  }

  const hostname = getHostHostname(input.host);
  if (hostname) {
    return !isLoopbackHostname(hostname);
  }

  return input.cookieSecure;
}

export function shouldUseSecureSessionCookieForRequest(
  req: Request,
  input: Pick<SecureCookieInput, "cookieSecureConfigured" | "cookieSecure">,
): boolean {
  return shouldUseSecureSessionCookie({
    ...input,
    forwardedProto: req.header("x-forwarded-proto"),
    origin: req.header("origin"),
    host: req.header("host"),
  });
}
