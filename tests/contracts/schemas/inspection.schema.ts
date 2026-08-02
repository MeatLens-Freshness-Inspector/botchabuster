import assert from "node:assert/strict";
import type { Inspection as FrontendInspection } from "../../../frontend/src/types/inspection";

const classifications = new Set(["fresh", "not fresh", "spoiled", "acceptable", "warning"]);

function assertRecord(value: unknown, message: string): asserts value is Record<string, unknown> {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), message);
}

function assertNullableNumber(value: unknown, message: string): void {
  if (value === null) {
    return;
  }

  assert.equal(typeof value, "number", message);
  assert.ok(Number.isFinite(value), message);
}

function assertNullableString(value: unknown, message: string): void {
  if (value === null) {
    return;
  }

  assert.equal(typeof value, "string", message);
}

function assertNullableBoolean(value: unknown, message: string): void {
  if (value === null) {
    return;
  }

  assert.equal(typeof value, "boolean", message);
}

export function assertInspectionSchema(value: unknown): asserts value is FrontendInspection {
  assertRecord(value, "Inspection payload must be an object");
  assert.equal(typeof value.id, "string", "Inspection id must be a string");
  assert.ok(value.user_id === null || typeof value.user_id === "string", "Inspection user_id must be a string or null");
  assert.equal(typeof value.meat_type, "string", "Inspection meat_type must be a string");
  assert.ok(classifications.has(String(value.classification)), "Inspection classification must be supported");
  assertNullableString(value.manual_classification, "Inspection manual_classification must be a string or null");
  assert.equal(typeof value.confidence_score, "number", "Inspection confidence_score must be a number");
  assert.ok(Array.isArray(value.flagged_deviations), "Inspection flagged_deviations must be an array");
  assert.ok(value.flagged_deviations.every((item) => typeof item === "string"), "Inspection flagged_deviations must contain only strings");
  assertNullableString(value.explanation, "Inspection explanation must be a string or null");
  assertNullableString(value.image_url, "Inspection image_url must be a string or null");
  assertNullableString(value.location, "Inspection location must be a string or null");
  assertNullableNumber(value.location_latitude, "Inspection location_latitude must be a number or null");
  assertNullableNumber(value.location_longitude, "Inspection location_longitude must be a number or null");
  assertNullableString(value.stall_number, "Inspection stall_number must be a string or null");
  assertNullableString(value.meat_inspection_certificate_proof, "Inspection certificate proof must be a string or null");
  assertNullableString(value.meat_expiry_date, "Inspection meat_expiry_date must be a string or null");
  assertNullableBoolean(value.storage_correct, "Inspection storage_correct must be a boolean or null");
  assertNullableBoolean(value.light_color_correct, "Inspection light_color_correct must be a boolean or null");
  assertNullableString(value.light_color_observed, "Inspection light_color_observed must be a string or null");
  assertNullableBoolean(value.area_clean, "Inspection area_clean must be a boolean or null");
  assert.ok(
    value.inspection_decision_source === null ||
      value.inspection_decision_source === undefined ||
      value.inspection_decision_source === "ai" ||
      value.inspection_decision_source === "protocol_pre_scan",
    "Inspection inspection_decision_source must be ai, protocol_pre_scan, null, or undefined",
  );
  assertNullableString(value.protocol_spoiled_reason, "Inspection protocol_spoiled_reason must be a string or null");
  assertNullableString(value.inspector_notes, "Inspection inspector_notes must be a string or null");
  assert.ok(value.captured_at === null || value.captured_at === undefined || typeof value.captured_at === "string", "Inspection captured_at must be a string, null, or undefined");
  assert.equal(typeof value.created_at, "string", "Inspection created_at must be a string");
  assert.equal(typeof value.updated_at, "string", "Inspection updated_at must be a string");
}

export function assertInspectionListSchema(value: unknown): asserts value is FrontendInspection[] {
  assert.ok(Array.isArray(value), "Inspection list payload must be an array");
  value.forEach((inspection) => assertInspectionSchema(inspection));
}
