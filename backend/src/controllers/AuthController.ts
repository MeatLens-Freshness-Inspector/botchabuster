import { Request, Response } from "express";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { Config } from "../config";
import { getRequestAccessToken, getRequestAuthContext, getCsrfTokenService, toAuditActor } from "../middleware/auth";
import { authService } from "../services/AuthService";
import { getAppSessionService, type AppSession } from "../services/AppSessionService";
import { profileService, type AppRole, type PrimaryRole } from "../services/ProfileService";
import { auditLogService, type AuditLogWriteInput } from "../services/AuditLogService";
import { passkeyService } from "../services/PasskeyService";
import { getSessionLimitService } from "../services/SessionLimitService";
import { getSessionCookieSameSite, shouldUseSecureSessionCookieForRequest } from "../security/sessionCookie";
import { isReportOrganization } from "../types/reportOrganization";

export class AuthController {
  private readonly config = Config.getInstance();

  private resolveOrigin(req: Request): string {
    return req.header("origin") || process.env.WEBAUTHN_ORIGIN || "http://localhost:8080";
  }

  private async resolveAuthenticatedUser(req: Request): Promise<{
    user: { id: string; email: string | null };
    roles: AppRole[];
    primaryRole: PrimaryRole;
    isAdmin: boolean;
    isDeveloper: boolean;
  }> {
    const authContext = getRequestAuthContext(req);
    return {
      user: {
        id: authContext.userId,
        email: authContext.email,
      },
      roles: authContext.roles,
      primaryRole: authContext.primaryRole,
      isAdmin: authContext.isAdmin,
      isDeveloper: authContext.isDeveloper,
    };
  }

  private async writeAuditLogSafely(input: AuditLogWriteInput): Promise<void> {
    try {
      await auditLogService.write(input);
    } catch (error) {
      console.error("Audit log write error:", error);
    }
  }

  private createSessionCookieOptions(req: Request, maxAgeMs: number) {
    const secure = shouldUseSecureSessionCookieForRequest(req, {
      cookieSecureConfigured: this.config.appSessionCookieSecureConfigured,
      cookieSecure: this.config.appSessionCookieSecure,
    });

    return {
      httpOnly: true,
      secure,
      sameSite: getSessionCookieSameSite(secure),
      path: "/",
      maxAge: maxAgeMs,
    };
  }

  private async loadProfileOrThrow(userId: string) {
    const profile = await profileService.getProfile(userId);
    if (!profile) {
      throw new Error("Signed-in user profile is missing");
    }

    return profile;
  }

  private toIsoString(unixSeconds: number): string {
    return new Date(unixSeconds * 1000).toISOString();
  }

  private buildClientSession(accessToken: string): AppSession {
    const sessionMetadata = getAppSessionService().getSession(accessToken);
    const nowSeconds = Math.floor(Date.now() / 1000);

    return {
      access_token: accessToken,
      refresh_token: null,
      token_type: "bearer",
      expires_in: Math.max(0, sessionMetadata.expiresAt - nowSeconds),
      expires_at: sessionMetadata.expiresAt,
      authenticated_at: sessionMetadata.authenticatedAt,
      offline_expires_at: sessionMetadata.offlineExpiresAt,
    };
  }

  private async buildBootstrapPayload(input: {
    user: { id: string; email: string | null };
    roles: AppRole[];
    primaryRole: PrimaryRole;
    isAdmin: boolean;
    isDeveloper: boolean;
    session: AppSession;
  }) {
    const sessionMetadata = getAppSessionService().getSession(input.session.access_token);
    const profile = await this.loadProfileOrThrow(input.user.id);
    const csrfToken = getCsrfTokenService().issueToken({
      sessionId: sessionMetadata.sessionId,
      userId: input.user.id,
    });

    return {
      user: input.user,
      profile,
      session: input.session,
      roles: input.roles,
      primaryRole: input.primaryRole,
      isAdmin: input.isAdmin,
      isDeveloper: input.isDeveloper,
      csrfToken,
      authenticatedAt: this.toIsoString(sessionMetadata.authenticatedAt),
      offlineExpiresAt: this.toIsoString(sessionMetadata.offlineExpiresAt),
    };
  }

  private async issueSessionResponse(req: Request, res: Response, input: {
    user: { id: string; email: string | null };
    roles: AppRole[];
    primaryRole: PrimaryRole;
    isAdmin: boolean;
    isDeveloper: boolean;
    session: AppSession;
  }): Promise<void> {
    res.cookie(
      this.config.appSessionCookieName,
      input.session.access_token,
      this.createSessionCookieOptions(req, input.session.expires_in * 1000),
    );

    res.json(await this.buildBootstrapPayload({
      user: input.user,
      roles: input.roles,
      primaryRole: input.primaryRole,
      isAdmin: input.isAdmin,
      isDeveloper: input.isDeveloper,
      session: input.session,
    }));
  }

  private clearSessionCookie(req: Request, res: Response): void {
    res.cookie(this.config.appSessionCookieName, "", {
      ...this.createSessionCookieOptions(req, 0),
      expires: new Date(0),
    });
  }

  async signIn(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as { email?: string; password?: string };

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      const result = await authService.signIn({ email, password });
      const privilege = await profileService.getPrivilegeSummary(result.user.id);
      const appSession = authService.createAppSession(result.user);

      await this.writeAuditLogSafely({
        payload: {
          event_type: "auth.sign_in",
          event_time: new Date().toISOString(),
          actor: {
            id: result.user.id,
            role: privilege.primaryRole,
          },
          source: {
            ip: req.ip || null,
            user_agent: req.header("user-agent") || null,
          },
          data: {
            email: result.user.email,
          },
        },
      });

      await this.issueSessionResponse(req, res, {
        user: result.user,
        roles: privilege.roles,
        primaryRole: privilege.primaryRole,
        isAdmin: privilege.isAdmin,
        isDeveloper: privilege.isDeveloper,
        session: appSession,
      });
    } catch (error) {
      console.error("Sign in error:", error);
      res.status(401).json({ error: error instanceof Error ? error.message : "Sign in failed" });
    }
  }

  async signUp(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, fullName, accessCode, reportOrganization, emailRedirectTo } = req.body as {
        email?: string;
        password?: string;
        fullName?: string;
        accessCode?: string;
        reportOrganization?: string;
        emailRedirectTo?: string;
      };

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      if (!accessCode || !accessCode.trim()) {
        res.status(400).json({ error: "Access code is required" });
        return;
      }

      if (!isReportOrganization(reportOrganization)) {
        res.status(400).json({
          error: "Report organization must be one of: dti, city_veterinary_office_olongapo, gordon_college_ccs",
        });
        return;
      }

      const result = await authService.signUp({
        email,
        password,
        fullName,
        accessCode: accessCode.trim(),
        reportOrganization,
        emailRedirectTo,
      });
      res.status(201).json(result);
    } catch (error) {
      console.error("Sign up error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Sign up failed" });
    }
  }

  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const authContext = getRequestAuthContext(req);
      const { accessToken } = getRequestAccessToken(req);

      res.json(await this.buildBootstrapPayload({
        user: {
          id: authContext.userId,
          email: authContext.email,
        },
        roles: authContext.roles,
        primaryRole: authContext.primaryRole,
        isAdmin: authContext.isAdmin,
        isDeveloper: authContext.isDeveloper,
        session: this.buildClientSession(accessToken),
      }));
    } catch (error) {
      console.error("Get session error:", error);
      res.status(401).json({ error: error instanceof Error ? error.message : "Authentication required" });
    }
  }

  async signOut(req: Request, res: Response): Promise<void> {
    try {
      const authContext = getRequestAuthContext(req);
      const { accessToken } = getRequestAccessToken(req);

      await authService.signOut();
      await getSessionLimitService().removeSession(accessToken);

      await this.writeAuditLogSafely({
        payload: {
          event_type: "auth.sign_out",
          event_time: new Date().toISOString(),
          actor: toAuditActor(authContext),
          source: {
            ip: req.ip || null,
            user_agent: req.header("user-agent") || null,
          },
        },
      });

      this.clearSessionCookie(req, res);
      res.status(204).send();
    } catch (error) {
      console.error("Sign out error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Sign out failed" });
    }
  }

  async sendPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email, redirectTo } = req.body as { email?: string; redirectTo?: string };
      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      await authService.sendPasswordReset(email, redirectTo);
      res.status(204).send();
    } catch (error) {
      console.error("Send password reset error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to send password reset" });
    }
  }

  async updateEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { email } = req.body as { email?: string };

      if (!id || !email) {
        res.status(400).json({ error: "User ID and email are required" });
        return;
      }

      const user = await authService.updateEmail(id, email);
      res.json(user);
    } catch (error) {
      console.error("Update email error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update email" });
    }
  }

  async updatePassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { password } = req.body as { password?: string };

      if (!id || !password) {
        res.status(400).json({ error: "User ID and password are required" });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      await authService.updatePassword(id, password);
      res.status(204).send();
    } catch (error) {
      console.error("Update password error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update password" });
    }
  }

  async updatePasswordWithRecoveryToken(req: Request, res: Response): Promise<void> {
    try {
      const { accessToken, password } = req.body as { accessToken?: string; password?: string };

      if (!accessToken || !password) {
        res.status(400).json({ error: "Recovery token and password are required" });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      await authService.updatePasswordWithRecoveryToken(accessToken, password);
      res.status(204).send();
    } catch (error) {
      console.error("Recovery password update error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update password" });
    }
  }

  async beginPasskeyRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { user } = await this.resolveAuthenticatedUser(req);
      const result = await passkeyService.beginRegistration(user, this.resolveOrigin(req));
      res.json(result);
    } catch (error) {
      console.error("Begin passkey registration error:", error);
      res.status(401).json({ error: error instanceof Error ? error.message : "Failed to begin passkey registration" });
    }
  }

  async verifyPasskeyRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { user, primaryRole } = await this.resolveAuthenticatedUser(req);
      const { challengeId, credential, deviceLabel } = req.body as {
        challengeId?: string;
        credential?: RegistrationResponseJSON;
        deviceLabel?: string;
      };

      if (!challengeId || !credential) {
        res.status(400).json({ error: "challengeId and credential are required" });
        return;
      }

      const registeredPasskey = await passkeyService.verifyRegistration({
        user,
        challengeId,
        origin: this.resolveOrigin(req),
        response: credential,
        deviceLabel,
      });

      await this.writeAuditLogSafely({
        payload: {
          event_type: "auth.passkey.register",
          event_time: new Date().toISOString(),
          actor: {
            id: user.id,
            role: primaryRole,
          },
          source: {
            ip: req.ip || null,
            user_agent: req.header("user-agent") || null,
          },
          data: {
            credential_id: registeredPasskey.credentialId,
            device_label: registeredPasskey.deviceLabel,
          },
        },
      });

      res.status(201).json(registeredPasskey);
    } catch (error) {
      console.error("Verify passkey registration error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to verify passkey registration" });
    }
  }

  async beginPasskeyAuthentication(req: Request, res: Response): Promise<void> {
    try {
      const result = await passkeyService.beginAuthentication(this.resolveOrigin(req));
      res.json(result);
    } catch (error) {
      console.error("Begin passkey sign-in error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to begin passkey sign-in" });
    }
  }

  async verifyPasskeyAuthentication(req: Request, res: Response): Promise<void> {
    try {
      const { challengeId, credential } = req.body as {
        challengeId?: string;
        credential?: AuthenticationResponseJSON;
      };

      if (!challengeId || !credential) {
        res.status(400).json({ error: "challengeId and credential are required" });
        return;
      }

      const result = await passkeyService.verifyAuthentication({
        challengeId,
        origin: this.resolveOrigin(req),
        response: credential,
      });
      const privilege = await profileService.getPrivilegeSummary(result.user.id);

      await this.writeAuditLogSafely({
        payload: {
          event_type: "auth.passkey.sign_in",
          event_time: new Date().toISOString(),
          actor: {
            id: result.user.id,
            role: privilege.primaryRole,
          },
          source: {
            ip: req.ip || null,
            user_agent: req.header("user-agent") || null,
          },
          data: {
            credential_id: credential.id,
            email: result.user.email,
          },
        },
      });

      await this.issueSessionResponse(req, res, {
        user: result.user,
        roles: privilege.roles,
        primaryRole: privilege.primaryRole,
        isAdmin: privilege.isAdmin,
        isDeveloper: privilege.isDeveloper,
        session: result.session,
      });
    } catch (error) {
      console.error("Verify passkey sign-in error:", error);
      res.status(401).json({ error: error instanceof Error ? error.message : "Failed to verify passkey sign-in" });
    }
  }

  async listPasskeys(req: Request, res: Response): Promise<void> {
    try {
      const { user } = await this.resolveAuthenticatedUser(req);
      const passkeys = await passkeyService.listPasskeys(user.id);
      res.json(passkeys);
    } catch (error) {
      console.error("List passkeys error:", error);
      res.status(401).json({ error: error instanceof Error ? error.message : "Failed to list passkeys" });
    }
  }

  async deletePasskey(req: Request, res: Response): Promise<void> {
    try {
      const { user, primaryRole } = await this.resolveAuthenticatedUser(req);
      const credentialId = decodeURIComponent(req.params.credentialId || "");
      if (!credentialId) {
        res.status(400).json({ error: "credentialId is required" });
        return;
      }

      await passkeyService.deletePasskey(user.id, credentialId);

      await this.writeAuditLogSafely({
        payload: {
          event_type: "auth.passkey.delete",
          event_time: new Date().toISOString(),
          actor: {
            id: user.id,
            role: primaryRole,
          },
          source: {
            ip: req.ip || null,
            user_agent: req.header("user-agent") || null,
          },
          data: {
            credential_id: credentialId,
          },
        },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Delete passkey error:", error);
      res.status(401).json({ error: error instanceof Error ? error.message : "Failed to remove passkey" });
    }
  }
}
