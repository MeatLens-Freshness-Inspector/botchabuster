import type { NextFunction, Request, RequestHandler, Response } from "express";
import { Config } from "../config";
import { isOriginAllowed } from "../config/cors";
import { authService } from "../services/AuthService";
import { getAppSessionService } from "../services/AppSessionService";
import { CsrfTokenService } from "../services/CsrfTokenService";
import { profileService } from "../services/ProfileService";
import { getSessionLimitService } from "../services/SessionLimitService";

export interface RequestAuthContext {
  userId: string;
  email: string | null;
  isAdmin: boolean;
}

export class RequestAuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

type AccessTokenSource = "bearer" | "cookie";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

let csrfTokenService: CsrfTokenService | null = null;

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex <= 0) {
        return cookies;
      }

      const name = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      if (name && value) {
        cookies[name] = value;
      }

      return cookies;
    }, {});
}

export function isSafeMethod(method: string | undefined): boolean {
  return SAFE_METHODS.has((method ?? "GET").toUpperCase());
}

export function getSessionCookie(req: Request): string | null {
  const cookieHeader = req.header("cookie") ?? "";
  return parseCookieHeader(cookieHeader)[Config.getInstance().appSessionCookieName] ?? null;
}

function getBearerToken(req: Request): string {
  const authorizationHeader = req.header("authorization");
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new RequestAuthError(401, "Authentication required");
  }

  const accessToken = authorizationHeader.slice("Bearer ".length).trim();
  if (!accessToken) {
    throw new RequestAuthError(401, "Authentication required");
  }

  return accessToken;
}

export function getRequestAccessToken(req: Request): { accessToken: string; source: AccessTokenSource } {
  const sessionCookie = getSessionCookie(req);
  if (sessionCookie) {
    return {
      accessToken: sessionCookie,
      source: "cookie",
    };
  }

  return {
    accessToken: getBearerToken(req),
    source: "bearer",
  };
}

export function getCsrfTokenService(): CsrfTokenService {
  if (csrfTokenService) {
    return csrfTokenService;
  }

  const config = Config.getInstance();
  csrfTokenService = new CsrfTokenService(config.csrfTokenSecret, config.csrfTokenTtlSeconds);
  return csrfTokenService;
}

function writeAuthError(res: Response, error: unknown): void {
  if (error instanceof RequestAuthError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  console.error("Request auth error:", error);
  res.status(500).json({ error: error instanceof Error ? error.message : "Authentication failed" });
}

async function resolveAndAttachAuthContext(req: Request): Promise<RequestAuthContext> {
  const authContext = await resolveTrackedRequestAuthContext(req);
  enforceCookieCsrf(req, authContext);
  const { accessToken, source } = getRequestAccessToken(req);
  req.auth = authContext;
  req.authAccessToken = accessToken;
  req.authAccessTokenSource = source;
  return authContext;
}

async function ensureTrackedAppSession(req: Request, authContext: RequestAuthContext): Promise<void> {
  const { accessToken } = getRequestAccessToken(req);
  const appSessionService = getAppSessionService();

  if (!appSessionService.looksLikeAppSessionToken(accessToken)) {
    return;
  }

  const sessionLimit = getSessionLimitService();
  if (await sessionLimit.hasSession(accessToken)) {
    return;
  }

  const session = appSessionService.getSession(accessToken);
  await sessionLimit.pruneExpiredSessions(authContext.userId);

  if (await sessionLimit.isAtLimit(authContext.userId)) {
    throw new RequestAuthError(
      429,
      "You are already signed in on the maximum number of devices. Please sign out from another device first.",
    );
  }

  await sessionLimit.registerSession(authContext.userId, accessToken, session.expiresAt);
}

export async function resolveRequestAuthContext(req: Request): Promise<RequestAuthContext> {
  const { accessToken } = getRequestAccessToken(req);

  let userId: string;
  let email: string | null;

  try {
    const user = await authService.getUserByAccessToken(accessToken);
    userId = user.id;
    email = user.email ?? null;
  } catch (error) {
    throw new RequestAuthError(401, error instanceof Error ? error.message : "Authentication required");
  }

  const isAdmin = await profileService.hasRole(userId, "admin");
  return { userId, email, isAdmin };
}

export async function resolveTrackedRequestAuthContext(req: Request): Promise<RequestAuthContext> {
  const authContext = await resolveRequestAuthContext(req);
  await ensureTrackedAppSession(req, authContext);
  return authContext;
}

function enforceCookieCsrf(req: Request, authContext: RequestAuthContext): void {
  if (isSafeMethod(req.method)) {
    return;
  }

  const sessionCookie = getSessionCookie(req);
  if (!sessionCookie) {
    return;
  }

  if (!isOriginAllowed(req.header("origin"), Config.getInstance().allowedOrigins)) {
    throw new RequestAuthError(403, "Origin not allowed");
  }

  const csrfToken = req.header("x-csrf-token")?.trim();
  if (!csrfToken) {
    throw new RequestAuthError(403, "CSRF token required");
  }

  const sessionId = getAppSessionService().getSessionId(sessionCookie);
  if (!sessionId) {
    throw new RequestAuthError(401, "Invalid or expired access token");
  }

  const isValid = getCsrfTokenService().verifyToken(csrfToken, {
    sessionId,
    userId: authContext.userId,
  });
  if (!isValid) {
    throw new RequestAuthError(403, "Invalid CSRF token");
  }
}

export function getRequestAuthContext(req: Request): RequestAuthContext {
  if (!req.auth) {
    throw new RequestAuthError(401, "Authentication required");
  }

  return req.auth;
}

export function assertSelf(authContext: RequestAuthContext, targetUserId: string): void {
  if (authContext.userId !== targetUserId) {
    throw new RequestAuthError(403, "Forbidden");
  }
}

export function assertSelfOrAdmin(authContext: RequestAuthContext, targetUserId: string): void {
  if (authContext.userId !== targetUserId && !authContext.isAdmin) {
    throw new RequestAuthError(403, "Forbidden");
  }
}

export function requireAuthentication(
  req: Request,
  res: Response,
  next: NextFunction,
): void | Promise<void> {
  return resolveAndAttachAuthContext(req)
    .then(() => next())
    .catch((error) => writeAuthError(res, error));
}

export const requireAdmin: RequestHandler = (req, res, next) => {
  return resolveAndAttachAuthContext(req)
    .then((authContext) => {
      if (!authContext.isAdmin) {
        throw new RequestAuthError(403, "Admin access required");
      }

      next();
    })
    .catch((error) => writeAuthError(res, error));
};

export function requireSelf(paramName: string): RequestHandler {
  return (req, res, next) => {
    return resolveAndAttachAuthContext(req)
      .then((authContext) => {
        const targetUserId = req.params[paramName];
        if (!targetUserId) {
          throw new RequestAuthError(400, "User ID is required");
        }

        assertSelf(authContext, targetUserId);
        next();
      })
      .catch((error) => writeAuthError(res, error));
  };
}

export function requireSelfOrAdmin(paramName: string): RequestHandler {
  return (req, res, next) => {
    return resolveAndAttachAuthContext(req)
      .then((authContext) => {
        const targetUserId = req.params[paramName];
        if (!targetUserId) {
          throw new RequestAuthError(400, "User ID is required");
        }

        assertSelfOrAdmin(authContext, targetUserId);
        next();
      })
      .catch((error) => writeAuthError(res, error));
  };
}
