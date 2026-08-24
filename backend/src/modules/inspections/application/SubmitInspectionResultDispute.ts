import {
  assertDisputeSubmission,
  type InspectionResultDispute,
  type InspectionResultDisputeSubmission,
} from "../../../types/inspectionResultDispute";
import type { InspectionResultDisputeRepository } from "../domain/ports/InspectionResultDisputeRepository";

export class SubmitInspectionResultDispute {
  constructor(private readonly repository: InspectionResultDisputeRepository) {}

  async execute(
    inspectionId: string,
    submittedBy: string,
    input: InspectionResultDisputeSubmission | Record<string, unknown>,
  ): Promise<InspectionResultDispute> {
    const normalizedInspectionId = inspectionId.trim();
    const normalizedSubmittedBy = submittedBy.trim();
    if (!normalizedInspectionId || !normalizedSubmittedBy) {
      throw new Error("Inspection and submitter are required");
    }

    const submission = assertDisputeSubmission({
      expectedClassification: input.expectedClassification,
      reason: input.reason,
    });

    return this.repository.create({
      inspectionId: normalizedInspectionId,
      submittedBy: normalizedSubmittedBy,
      ...submission,
    });
  }
}
