import type { Request, Response } from "express";
import { getErrorStatus, getRequestAuthContext, resolveTrackedRequestAuthContext, toAuditActor } from "../../../../middleware/auth";
import { auditLogService } from "../../../audit/infrastructure/AuditLogService";
import {
  assertDisputeSubmission,
  type InspectionResultDisputeReviewDecision,
} from "../../../../types/inspectionResultDispute";
import { ApplyDisputeToDeveloperDataset } from "../../application/ApplyDisputeToDeveloperDataset";
import { ListInspectionResultDisputes } from "../../application/ListInspectionResultDisputes";
import { ListPendingInspectionResultDisputes } from "../../application/ListPendingInspectionResultDisputes";
import { ReviewInspectionResultDispute } from "../../application/ReviewInspectionResultDispute";
import { SubmitInspectionResultDispute } from "../../application/SubmitInspectionResultDispute";
import { inspectionResultDisputeService } from "../../infrastructure/InspectionResultDisputeService";

const submitDispute = new SubmitInspectionResultDispute(inspectionResultDisputeService);
const listDisputes = new ListInspectionResultDisputes(inspectionResultDisputeService);
const listPendingDisputes = new ListPendingInspectionResultDisputes(inspectionResultDisputeService);
const applyDeveloperLabel = new ApplyDisputeToDeveloperDataset(inspectionResultDisputeService);
const reviewDispute = new ReviewInspectionResultDispute(inspectionResultDisputeService);

function getRequestErrorStatus(error: unknown): number {
  const authStatus = getErrorStatus(error);
  if (authStatus) return authStatus;
  if (error instanceof Error && /not found/i.test(error.message)) return 404;
  if (error instanceof Error && /no longer pending|pending dispute already exists/i.test(error.message)) return 409;
  if (error instanceof Error && /required|invalid|between|must be|pending dispute/i.test(error.message)) return 400;
  return 500;
}

export class InspectionResultDisputeController {
  private async getAuth(req: Request) {
    return req.auth ?? await resolveTrackedRequestAuthContext(req);
  }

  private handleError(action: string, res: Response, error: unknown): void {
    console.error(`${action} error:`, error);
    res.status(getRequestErrorStatus(error)).json({
      error: error instanceof Error ? error.message : "Inspection dispute operation failed",
    });
  }

  async listForInspector(req: Request, res: Response): Promise<void> {
    try {
      const authContext = await this.getAuth(req);
      res.json(await listDisputes.execute(authContext.userId));
    } catch (error) {
      this.handleError("List inspection disputes", res, error);
    }
  }

  async submit(req: Request, res: Response): Promise<void> {
    try {
      const authContext = await this.getAuth(req);
      const inspectionId = req.params.id?.trim() ?? "";
      const body = (req.body ?? {}) as Record<string, unknown>;
      const submission = assertDisputeSubmission({
        expectedClassification: body.expectedClassification,
        reason: body.reason,
      });
      const dispute = await submitDispute.execute(inspectionId, authContext.userId, submission);

      await auditLogService.write({
        payload: {
          event_type: "inspection.result_dispute.submitted",
          event_time: new Date().toISOString(),
          actor: toAuditActor(authContext),
          source: { ip: req.ip || null, user_agent: req.header("user-agent") || null },
          data: {
            dispute_id: dispute.id,
            inspection_id: dispute.inspection_id,
            expected_classification: dispute.expected_classification,
            reason: dispute.reason,
          },
        },
      });

      res.status(201).json(dispute);
    } catch (error) {
      this.handleError("Submit inspection dispute", res, error);
    }
  }

  async listPendingForReview(_req: Request, res: Response): Promise<void> {
    try {
      res.json(await listPendingDisputes.execute());
    } catch (error) {
      this.handleError("List pending inspection disputes", res, error);
    }
  }

  async applyToDeveloperDataset(req: Request, res: Response): Promise<void> {
    try {
      const authContext = getRequestAuthContext(req);
      const result = await applyDeveloperLabel.execute(req.params.disputeId ?? "", authContext.userId);

      await auditLogService.write({
        payload: {
          event_type: "inspection.result_dispute.developer_label_applied",
          event_time: new Date().toISOString(),
          actor: toAuditActor(authContext),
          source: { ip: req.ip || null, user_agent: req.header("user-agent") || null },
          data: {
            dispute_id: result.dispute.id,
            inspection_id: result.dispute.inspection_id,
            expected_classification: result.dispute.expected_classification,
            previous_manual_classification: result.previousManualClassification ?? null,
          },
        },
      });

      res.json(result);
    } catch (error) {
      this.handleError("Apply inspection dispute to developer dataset", res, error);
    }
  }

  async review(req: Request, res: Response): Promise<void> {
    try {
      const authContext = getRequestAuthContext(req);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const decision = typeof body.decision === "string" ? body.decision : "";
      const reviewerNote = body.reviewerNote === null || body.reviewerNote === undefined
        ? null
        : typeof body.reviewerNote === "string" ? body.reviewerNote : "";
      if (reviewerNote && reviewerNote.trim().length > 2_000) {
        res.status(400).json({ error: "reviewerNote must not exceed 2000 characters" });
        return;
      }

      const result = await reviewDispute.execute(
        req.params.disputeId ?? "",
        authContext.userId,
        decision as InspectionResultDisputeReviewDecision | string,
        reviewerNote,
      );

      await auditLogService.write({
        payload: {
          event_type: "inspection.result_dispute.reviewed",
          event_time: new Date().toISOString(),
          actor: toAuditActor(authContext),
          source: { ip: req.ip || null, user_agent: req.header("user-agent") || null },
          data: {
            dispute_id: result.dispute.id,
            inspection_id: result.dispute.inspection_id,
            decision: result.dispute.status,
            expected_classification: result.dispute.expected_classification,
            previous_official_classification: result.previousOfficialClassification ?? null,
            reviewer_note: result.dispute.reviewer_note,
          },
        },
      });

      res.json(result);
    } catch (error) {
      this.handleError("Review inspection dispute", res, error);
    }
  }
}
