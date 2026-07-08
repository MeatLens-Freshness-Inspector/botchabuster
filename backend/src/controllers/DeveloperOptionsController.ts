import { Request, Response } from "express";
import { developerOptionsService } from "../services/DeveloperOptionsService";
import { auditLogService } from "../services/AuditLogService";
import { resolveTrackedRequestAuthContext } from "../middleware/auth";

class DeveloperOptionsAccessError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export class DeveloperOptionsController {
  private async requireAdmin(req: Request): Promise<{ userId: string }> {
    try {
      const authContext = await resolveTrackedRequestAuthContext(req);
      if (!authContext.isAdmin) {
        throw new DeveloperOptionsAccessError(403, "Administrator access required");
      }

      return { userId: authContext.userId };
    } catch (error) {
      if (error instanceof DeveloperOptionsAccessError) {
        throw error;
      }

      throw new DeveloperOptionsAccessError(401, error instanceof Error ? error.message : "Authentication required");
    }
  }

  private handleError(action: string, res: Response, error: unknown, fallbackMessage: string): void {
    console.error(`${action} error:`, error);

    if (error instanceof DeveloperOptionsAccessError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: error instanceof Error ? error.message : fallbackMessage });
  }

  async unlock(req: Request, res: Response): Promise<void> {
    try {
      const actor = await this.requireAdmin(req);

      if (!developerOptionsService.isConfigured()) {
        res.status(503).json({ error: "Developer options are unavailable because password is not configured" });
        return;
      }

      const { password } = req.body as { password?: string };
      if (typeof password !== "string" || password.length === 0) {
        res.status(400).json({ error: "Developer options password is required" });
        return;
      }

      if (!developerOptionsService.verifyPassword(password)) {
        res.status(403).json({ error: "Invalid developer options password" });
        return;
      }

      const tokenPayload = developerOptionsService.createUnlockToken(actor.userId);

      await auditLogService.write({
        payload: {
          event_type: "admin.developer_options.unlock",
          event_time: new Date().toISOString(),
          actor: {
            id: actor.userId,
            role: "admin",
          },
          source: {
            ip: req.ip || null,
            user_agent: req.header("user-agent") || null,
          },
          data: {
            expires_at: tokenPayload.expiresAt,
          },
        },
      });

      res.status(200).json({
        token: tokenPayload.token,
        expires_at: tokenPayload.expiresAt,
      });
    } catch (error) {
      this.handleError("Developer options unlock", res, error, "Failed to unlock developer options");
    }
  }

  async verify(req: Request, res: Response): Promise<void> {
    try {
      const actor = await this.requireAdmin(req);

      const { token } = req.body as { token?: string };
      if (typeof token !== "string" || token.length === 0) {
        res.status(400).json({ error: "Developer options token is required" });
        return;
      }

      const isValid = developerOptionsService.verifyUnlockToken(token, actor.userId);
      if (!isValid) {
        res.status(401).json({ error: "Developer options token is invalid or expired" });
        return;
      }

      res.status(200).json({ valid: true });
    } catch (error) {
      this.handleError("Developer options verify", res, error, "Failed to verify developer options token");
    }
  }
}
