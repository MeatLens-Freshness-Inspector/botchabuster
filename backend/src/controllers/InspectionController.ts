import { Request, Response } from "express";
import { authService } from "../services/AuthService";
import { inspectionService } from "../services/InspectionService";
import type { InspectionScope } from "../services/InspectionService";
import { profileService } from "../services/ProfileService";
import type { InspectionInsert } from "../types/inspection";
import { auditLogService } from "../services/AuditLogService";
import { normalizeInspectionCoordinates } from "../types/inspectionCoordinates";
import {
  assertInspectionDecisionPayload,
  normalizeInspectionPreScan,
} from "../types/inspectionPreScan";

class RequestAccessError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export class InspectionController {
  private getScope(req: Request): InspectionScope {
    return req.query.scope === "all" ? "all" : "mine";
  }

  private async getRequestAccessContext(req: Request): Promise<{ userId: string; isAdmin: boolean }> {
    const authorizationHeader = req.header("authorization");
    if (!authorizationHeader?.startsWith("Bearer ")) {
      throw new RequestAccessError(401, "Authentication required");
    }

    const accessToken = authorizationHeader.slice("Bearer ".length).trim();
    if (!accessToken) {
      throw new RequestAccessError(401, "Authentication required");
    }

    let userId: string;

    try {
      const user = await authService.getUserByAccessToken(accessToken);
      userId = user.id;
    } catch (error) {
      throw new RequestAccessError(401, error instanceof Error ? error.message : "Authentication required");
    }

    const isAdmin = await profileService.hasRole(userId, "admin");
    return { userId, isAdmin };
  }

  private handleError(action: string, res: Response, error: unknown, fallbackMessage: string): void {
    console.error(`${action} error:`, error);

    if (error instanceof RequestAccessError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: error instanceof Error ? error.message : fallbackMessage });
  }

  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const accessContext = await this.getRequestAccessContext(req);
      const stats = await inspectionService.getStatistics(accessContext.userId, this.getScope(req), accessContext.isAdmin);
      res.json(stats);
    } catch (error) {
      this.handleError("Get inspection statistics", res, error, "Failed to fetch inspection statistics");
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const accessContext = await this.getRequestAccessContext(req);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const inspections = await inspectionService.getAll(limit, offset, accessContext.userId, this.getScope(req), accessContext.isAdmin);
      res.json(inspections);
    } catch (error) {
      this.handleError("Get inspections", res, error, "Failed to fetch inspections");
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const accessContext = await this.getRequestAccessContext(req);
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "Inspection ID is required" });
        return;
      }
      const inspection = await inspectionService.getById(id, accessContext.userId, this.getScope(req), accessContext.isAdmin);
      if (!inspection) {
        res.status(404).json({ error: "Inspection not found" });
        return;
      }
      res.json(inspection);
    } catch (error) {
      this.handleError("Get inspection", res, error, "Failed to fetch inspection");
    }
  }

  private normalizeEventTime(value?: string, fallback?: string): string {
    if (value) {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed).toISOString();
      }
    }

    if (fallback) {
      const parsedFallback = Date.parse(fallback);
      if (!Number.isNaN(parsedFallback)) {
        return new Date(parsedFallback).toISOString();
      }
    }

    return new Date().toISOString();
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const accessContext = await this.getRequestAccessContext(req);
      const {
        captured_at,
        location_latitude,
        location_longitude,
        ...input
      } = req.body as Partial<InspectionInsert> & {
        captured_at?: string;
        location_latitude?: unknown;
        location_longitude?: unknown;
      };
      if (!input.client_submission_id) {
        res.status(400).json({ error: "client_submission_id is required" });
        return;
      }

      let normalizedCapturedAt: string | undefined;
      if (captured_at !== undefined) {
        const parsedCapturedAt = Date.parse(captured_at);
        if (Number.isNaN(parsedCapturedAt)) {
          res.status(400).json({ error: "captured_at must be a valid ISO datetime string" });
          return;
        }
        normalizedCapturedAt = new Date(parsedCapturedAt).toISOString();
      }

      let coordinates;
      try {
        coordinates = normalizeInspectionCoordinates({
          location_latitude,
          location_longitude,
        });
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Invalid inspection coordinates",
        });
        return;
      }

      let preScanFields;
      try {
        preScanFields = normalizeInspectionPreScan(input as Record<string, unknown>);
      } catch (error) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Invalid inspection pre-scan payload",
        });
        return;
      }

      const inspectionInput: InspectionInsert = {
        ...(input as InspectionInsert),
        ...coordinates,
        ...preScanFields,
        ...(normalizedCapturedAt ? { captured_at: normalizedCapturedAt } : {}),
      };

      try {
        assertInspectionDecisionPayload(inspectionInput);
      } catch (error) {
        res.status(400).json({
          error:
            error instanceof Error ? error.message : "Invalid inspection decision payload",
        });
        return;
      }

      const { inspection, created } = await inspectionService.create(inspectionInput, accessContext.userId);

      if (created) {
        await auditLogService.write({
          payload: {
            event_type: "inspection.capture",
            event_time: this.normalizeEventTime(captured_at, inspection.created_at),
            actor: {
              id: accessContext.userId,
              role: accessContext.isAdmin ? "admin" : "inspector",
            },
            source: {
              ip: req.ip || null,
              user_agent: req.header("user-agent") || null,
            },
            data: {
              inspection_id: inspection.id,
              client_submission_id: inspection.client_submission_id,
              meat_type: inspection.meat_type,
              location: inspection.location,
              location_latitude: inspection.location_latitude,
              location_longitude: inspection.location_longitude,
              stall_number: inspection.stall_number,
              meat_inspection_certificate_proof:
                inspection.meat_inspection_certificate_proof,
              meat_expiry_date: inspection.meat_expiry_date,
              storage_correct: inspection.storage_correct,
              light_color_correct: inspection.light_color_correct,
              light_color_observed: inspection.light_color_observed,
              area_clean: inspection.area_clean,
              inspection_decision_source: inspection.inspection_decision_source,
              protocol_spoiled_reason: inspection.protocol_spoiled_reason,
              classification: inspection.classification,
              confidence_score: inspection.confidence_score,
            },
          },
        });
      }

      res.status(created ? 201 : 200).json(inspection);
    } catch (error) {
      this.handleError("Create inspection", res, error, "Failed to create inspection");
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const accessContext = await this.getRequestAccessContext(req);
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "Inspection ID is required" });
        return;
      }
      await inspectionService.delete(id, accessContext.userId, accessContext.isAdmin);

      if (accessContext.isAdmin) {
        await auditLogService.write({
          payload: {
            event_type: "admin.inspection.delete",
            event_time: new Date().toISOString(),
            actor: {
              id: accessContext.userId,
              role: "admin",
            },
            source: {
              ip: req.ip || null,
              user_agent: req.header("user-agent") || null,
            },
            data: {
              inspection_id: id,
            },
          },
        });
      }

      res.status(204).send();
    } catch (error) {
      this.handleError("Delete inspection", res, error, "Failed to delete inspection");
    }
  }
}
