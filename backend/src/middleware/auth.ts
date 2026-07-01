import type { NextFunction, Request, RequestHandler, Response } from "express";
import { authService } from "../services/AuthService";
import { profileService } from "../services/ProfileService";

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

function writeAuthError(res: Response, error: unknown): void {
  if (error instanceof RequestAuthError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  console.error("Request auth error:", error);
  res.status(500).json({ error: error instanceof Error ? error.message : "Authentication failed" });
}

async function resolveAndAttachAuthContext(req: Request): Promise<RequestAuthContext> {
  const authContext = await resolveRequestAuthContext(req);
  req.auth = authContext;
  return authContext;
}

export async function resolveRequestAuthContext(req: Request): Promise<RequestAuthContext> {
  const accessToken = getBearerToken(req);

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
