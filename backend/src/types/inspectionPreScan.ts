import type { InspectionDecisionSource, InspectionInsert } from "./inspection";

export type { InspectionDecisionSource } from "./inspection";

export type InspectionPreScanFields = Pick<
  InspectionInsert,
  | "stall_number"
  | "meat_inspection_certificate_proof"
  | "meat_expiry_date"
  | "storage_correct"
  | "light_color_correct"
  | "light_color_observed"
  | "area_clean"
  | "inspection_decision_source"
  | "protocol_spoiled_reason"
>;

type InspectionDecisionPayload = {
  classification: string;
  inspection_decision_source?: InspectionDecisionSource | null;
  protocol_spoiled_reason?: string | null;
};

const DECISION_SOURCES = new Set<InspectionDecisionSource>(["ai", "protocol_pre_scan"]);

function normalizeOptionalText(value: unknown, fieldName: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalBoolean(value: unknown, fieldName: string): boolean | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} must be a boolean`);
  }

  return value;
}

function normalizeOptionalDate(value: unknown, fieldName: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a valid date string`);
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid date string`);
  }

  return new Date(parsed).toISOString().slice(0, 10);
}

function normalizeDecisionSource(value: unknown): InspectionDecisionSource | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !DECISION_SOURCES.has(value as InspectionDecisionSource)) {
    throw new Error("inspection_decision_source must be one of ai, protocol_pre_scan");
  }

  return value as InspectionDecisionSource;
}

export function normalizeInspectionPreScan(input: Record<string, unknown>): InspectionPreScanFields {
  const lightColorCorrect = normalizeOptionalBoolean(
    input.light_color_correct,
    "light_color_correct",
  );

  return {
    stall_number: normalizeOptionalText(input.stall_number, "stall_number"),
    meat_inspection_certificate_proof: normalizeOptionalText(
      input.meat_inspection_certificate_proof,
      "meat_inspection_certificate_proof",
    ),
    meat_expiry_date: normalizeOptionalDate(input.meat_expiry_date, "meat_expiry_date"),
    storage_correct: normalizeOptionalBoolean(input.storage_correct, "storage_correct"),
    light_color_correct: lightColorCorrect,
    light_color_observed:
      lightColorCorrect === false
        ? normalizeOptionalText(input.light_color_observed, "light_color_observed")
        : null,
    area_clean: normalizeOptionalBoolean(input.area_clean, "area_clean"),
    inspection_decision_source: normalizeDecisionSource(input.inspection_decision_source),
    protocol_spoiled_reason: normalizeOptionalText(
      input.protocol_spoiled_reason,
      "protocol_spoiled_reason",
    ),
  };
}

export function assertInspectionDecisionPayload(input: InspectionDecisionPayload): void {
  if (input.inspection_decision_source === "protocol_pre_scan") {
    if (input.classification !== "spoiled") {
      throw new Error("protocol_pre_scan inspections must use classification spoiled");
    }

    if (!input.protocol_spoiled_reason) {
      throw new Error(
        "protocol_spoiled_reason is required when inspection_decision_source is protocol_pre_scan",
      );
    }
  }

  if (input.inspection_decision_source === "ai" && input.protocol_spoiled_reason != null) {
    throw new Error("protocol_spoiled_reason must be null when inspection_decision_source is ai");
  }
}

export function mergeInspectionPreScanFields<T extends Record<string, unknown>>(
  payload: T,
  fields: InspectionPreScanFields,
): T & InspectionPreScanFields {
  const next = { ...payload } as T & InspectionPreScanFields;

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      (next as Record<string, unknown>)[key] = value;
    }
  }

  return next;
}
