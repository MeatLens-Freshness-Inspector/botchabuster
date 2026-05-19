import { Request, Response } from "express";
import { accessCodeService } from "../services/AccessCodeService";
import { authService } from "../services/AuthService";
import { profileService } from "../services/ProfileService";
import { auditLogService } from "../services/AuditLogService";

class AccessCodeAccessError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export class AccessCodeController {
  private async requireAdmin(req: Request): Promise<{ userId: string }> {
    const authorizationHeader = req.header("authorization");
    if (!authorizationHeader?.startsWith("Bearer ")) {
      throw new AccessCodeAccessError(401, "Authentication required");
    }

    const accessToken = authorizationHeader.slice("Bearer ".length).trim();
    if (!accessToken) {
      throw new AccessCodeAccessError(401, "Authentication required");
    }

    let userId: string;
    try {
      const user = await authService.getUserByAccessToken(accessToken);
      userId = user.id;
    } catch (error) {
      throw new AccessCodeAccessError(401, error instanceof Error ? error.message : "Authentication required");
    }

    const isAdmin = await profileService.hasRole(userId, "admin");
    if (!isAdmin) {
      throw new AccessCodeAccessError(403, "Admin access required");
    }

    return { userId };
  }

  private handleError(action: string, res: Response, error: unknown, fallbackMessage: string): void {
    console.error(`${action} error:`, error);

    if (error instanceof AccessCodeAccessError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: error instanceof Error ? error.message : fallbackMessage });
  }

  async validate(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body as { code?: string };
      if (!code) {
        res.status(400).json({ error: "Code is required" });
        return;
      }

      const isValid = await accessCodeService.validate(code);
      res.json({ valid: isValid });
    } catch (error) {
      this.handleError("Validate access code", res, error, "Failed to validate access code");
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      await this.requireAdmin(req);
      const codes = await accessCodeService.getAll();
      res.json(codes);
    } catch (error) {
      this.handleError("Get access codes", res, error, "Failed to fetch access codes");
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const actor = await this.requireAdmin(req);
      const { code, description } = req.body;
      if (!code) {
        res.status(400).json({ error: "Code is required" });
        return;
      }
      const created = await accessCodeService.create(code, description, actor.userId);

      await auditLogService.write({
        payload: {
          event_type: "admin.access_code.create",
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
            access_code_id: created.id,
            is_active: created.is_active,
          },
        },
      });

      res.status(201).json(created);
    } catch (error) {
      this.handleError("Create access code", res, error, "Failed to create access code");
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const actor = await this.requireAdmin(req);
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "Access code ID is required" });
        return;
      }
      await accessCodeService.delete(id);

      await auditLogService.write({
        payload: {
          event_type: "admin.access_code.delete",
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
            access_code_id: id,
          },
        },
      });

      res.status(204).send();
    } catch (error) {
      this.handleError("Delete access code", res, error, "Failed to delete access code");
    }
  }

  async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const actor = await this.requireAdmin(req);
      const { id } = req.params;
      const { is_active } = req.body;
      if (!id) {
        res.status(400).json({ error: "Access code ID is required" });
        return;
      }
      if (typeof is_active !== "boolean") {
        res.status(400).json({ error: "is_active must be a boolean" });
        return;
      }
      const updated = await accessCodeService.toggleActive(id, is_active);

      await auditLogService.write({
        payload: {
          event_type: "admin.access_code.toggle",
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
            access_code_id: updated.id,
            is_active: updated.is_active,
          },
        },
      });

      res.json(updated);
    } catch (error) {
      this.handleError("Toggle access code", res, error, "Failed to toggle access code");
    }
  }
}
