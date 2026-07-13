import { Request, Response } from "express";
import { auditLogService } from "../services/AuditLogService";
import { getErrorStatus, resolveTrackedRequestAuthContext, toAuditActor, type RequestAuthContext } from "../middleware/auth";

class AuditLogAccessError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

type AuditLogEventInput = {
  client_event_id?: string;
  event_type?: string;
  event_time?: string;
  data?: Record<string, unknown>;
  source?: Record<string, unknown>;
};

function normalizeEventTime(value?: string): string {
  if (!value) return new Date().toISOString();
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return new Date().toISOString();
  return new Date(parsed).toISOString();
}

export class AuditLogController {
  private async getActorContext(req: Request): Promise<RequestAuthContext> {
    try {
      return await resolveTrackedRequestAuthContext(req);
    } catch (error) {
      throw new AuditLogAccessError(
        getErrorStatus(error) ?? 401,
        error instanceof Error ? error.message : "Authentication required",
      );
    }
  }

  private parseLimit(req: Request): number {
    const limitRaw = req.query.limit;
    if (typeof limitRaw !== "string" || !limitRaw.trim()) {
      return 100;
    }

    const parsed = Number.parseInt(limitRaw, 10);
    if (!Number.isFinite(parsed)) {
      return 100;
    }

    return Math.min(Math.max(parsed, 1), 500);
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const actor = await this.getActorContext(req);
      if (!actor.isAdmin) {
        res.status(403).json({ error: "Admin access is required" });
        return;
      }

      const logs = await auditLogService.listRecent(this.parseLimit(req));
      res.json({ logs });
    } catch (error) {
      if (error instanceof AuditLogAccessError) {
        res.status(error.status).json({ error: error.message });
        return;
      }

      console.error("List audit logs error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch audit logs" });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { events } = req.body as { events?: AuditLogEventInput[] };
      if (!Array.isArray(events) || events.length === 0) {
        res.status(400).json({ error: "events is required" });
        return;
      }

      const actor = await this.getActorContext(req);
      const requestSource = {
        ip: req.ip || null,
        user_agent: req.header("user-agent") || null,
      };

      const payloads = events.map((event) => {
        if (!event.event_type || typeof event.event_type !== "string") {
          throw new AuditLogAccessError(400, "event_type is required");
        }

        return {
          clientEventId: event.client_event_id,
          payload: {
            event_type: event.event_type,
            event_time: normalizeEventTime(event.event_time),
            actor: toAuditActor(actor),
            source: {
              ...requestSource,
              ...(event.source ?? {}),
            },
            data: event.data ?? {},
          },
        };
      });

      const accepted = await auditLogService.writeBatch(payloads);
      res.status(202).json({ accepted });
    } catch (error) {
      if (error instanceof AuditLogAccessError) {
        res.status(error.status).json({ error: error.message });
        return;
      }

      console.error("Create audit logs error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create audit logs" });
    }
  }
}
