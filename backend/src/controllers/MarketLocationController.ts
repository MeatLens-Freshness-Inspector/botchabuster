import { Request, Response } from "express";
import { marketLocationService } from "../services/MarketLocationService";
import { auditLogService } from "../services/AuditLogService";
import { getErrorStatus, resolveTrackedRequestAuthContext, toAuditActor, type RequestAuthContext } from "../middleware/auth";

class MarketLocationAccessError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export class MarketLocationController {
  private async requireAdmin(req: Request): Promise<RequestAuthContext> {
    try {
      const authContext = await resolveTrackedRequestAuthContext(req);
      if (!authContext.isAdmin) {
        throw new MarketLocationAccessError(403, "Admin access required");
      }

      return authContext;
    } catch (error) {
      if (error instanceof MarketLocationAccessError) {
        throw error;
      }

      throw new MarketLocationAccessError(
        getErrorStatus(error) ?? 401,
        error instanceof Error ? error.message : "Authentication required",
      );
    }
  }

  private handleError(action: string, res: Response, error: unknown, fallbackMessage: string): void {
    console.error(`${action} error:`, error);

    if (error instanceof MarketLocationAccessError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: error instanceof Error ? error.message : fallbackMessage });
  }

  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const locations = await marketLocationService.getAll();
      res.json(locations);
    } catch (error) {
      this.handleError("Get market locations", res, error, "Failed to fetch market locations");
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const actor = await this.requireAdmin(req);

      const { name } = req.body as { name?: string };
      if (!name || !name.trim()) {
        res.status(400).json({ error: "Market location name is required" });
        return;
      }

      const createdLocation = await marketLocationService.create(name);

      await auditLogService.write({
        payload: {
          event_type: "admin.market_location.create",
          event_time: new Date().toISOString(),
          actor: toAuditActor(actor),
          source: {
            ip: req.ip || null,
            user_agent: req.header("user-agent") || null,
          },
          data: {
            market_location_id: createdLocation.id,
            name: createdLocation.name,
          },
        },
      });

      res.status(201).json(createdLocation);
    } catch (error) {
      this.handleError("Create market location", res, error, "Failed to create market location");
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const actor = await this.requireAdmin(req);

      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "Market location ID is required" });
        return;
      }

      await marketLocationService.delete(id);

      await auditLogService.write({
        payload: {
          event_type: "admin.market_location.delete",
          event_time: new Date().toISOString(),
          actor: toAuditActor(actor),
          source: {
            ip: req.ip || null,
            user_agent: req.header("user-agent") || null,
          },
          data: {
            market_location_id: id,
          },
        },
      });

      res.status(204).send();
    } catch (error) {
      this.handleError("Delete market location", res, error, "Failed to delete market location");
    }
  }
}
