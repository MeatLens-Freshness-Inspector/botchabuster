import { Request, Response } from "express";
import { accessCodeService } from "../../../access-codes/infrastructure/AccessCodeService";
import { auditLogService } from "../../../audit/infrastructure/AuditLogService";
import { getErrorStatus, resolveTrackedRequestAuthContext, toAuditActor, type RequestAuthContext } from "../../../../middleware/auth";
import { ListAccessCodes } from "../../application/ListAccessCodes";
import { ValidateAccessCode } from "../../application/ValidateAccessCode";
import { CreateAccessCode } from "../../application/CreateAccessCode";
import { DeleteAccessCode } from "../../application/DeleteAccessCode";
import { ToggleAccessCode } from "../../application/ToggleAccessCode";

class AccessCodeAccessError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export class AccessCodeController {
  private readonly listAccessCodes = new ListAccessCodes(accessCodeService);
  private readonly validateAccessCode = new ValidateAccessCode(accessCodeService);
  private readonly createAccessCode = new CreateAccessCode(accessCodeService);
  private readonly deleteAccessCode = new DeleteAccessCode(accessCodeService);
  private readonly toggleAccessCode = new ToggleAccessCode(accessCodeService);
  private async requireAdmin(req: Request): Promise<RequestAuthContext> {
    try {
      const authContext = await resolveTrackedRequestAuthContext(req);
      if (!authContext.isAdmin) {
        throw new AccessCodeAccessError(403, "Admin access required");
      }

      return authContext;
    } catch (error) {
      if (error instanceof AccessCodeAccessError) {
        throw error;
      }

      throw new AccessCodeAccessError(
        getErrorStatus(error) ?? 401,
        error instanceof Error ? error.message : "Authentication required",
      );
    }
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

      const isValid = await this.validateAccessCode.execute(code);
      res.json({ valid: isValid });
    } catch (error) {
      this.handleError("Validate access code", res, error, "Failed to validate access code");
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      await this.requireAdmin(req);
      const codes = await this.listAccessCodes.execute();
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
      const created = await this.createAccessCode.execute({ code, description, createdBy: actor.userId });

      await auditLogService.write({
        payload: {
          event_type: "admin.access_code.create",
          event_time: new Date().toISOString(),
          actor: toAuditActor(actor),
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
      await this.deleteAccessCode.execute(id);

      await auditLogService.write({
        payload: {
          event_type: "admin.access_code.delete",
          event_time: new Date().toISOString(),
          actor: toAuditActor(actor),
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
      const updated = await this.toggleAccessCode.execute({ id, isActive: is_active });

      await auditLogService.write({
        payload: {
          event_type: "admin.access_code.toggle",
          event_time: new Date().toISOString(),
          actor: toAuditActor(actor),
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
