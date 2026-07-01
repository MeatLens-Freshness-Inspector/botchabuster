import assert from "node:assert/strict";
import test from "node:test";
import {
  assertInspectionDecisionPayload,
  mergeInspectionPreScanFields,
  normalizeInspectionPreScan,
} from "../src/types/inspectionPreScan";

test("normalizeInspectionPreScan trims text fields, preserves booleans, and clears light_color_observed unless light_color_correct is false", () => {
  assert.deepEqual(
    normalizeInspectionPreScan({
      stall_number: " 12-A ",
      meat_inspection_certificate_proof: " CERT-77 ",
      meat_expiry_date: "2026-07-10",
      storage_correct: true,
      light_color_correct: true,
      light_color_observed: " yellow ",
      area_clean: false,
      inspection_decision_source: "ai",
      protocol_spoiled_reason: null,
    }),
    {
      stall_number: "12-A",
      meat_inspection_certificate_proof: "CERT-77",
      meat_expiry_date: "2026-07-10",
      storage_correct: true,
      light_color_correct: true,
      light_color_observed: null,
      area_clean: false,
      inspection_decision_source: "ai",
      protocol_spoiled_reason: null,
    },
  );
});

test("normalizeInspectionPreScan rejects invalid date and decision source values", () => {
  assert.throws(
    () =>
      normalizeInspectionPreScan({
        meat_expiry_date: "next week",
      }),
    /meat_expiry_date must be a valid date string/i,
  );

  assert.throws(
    () =>
      normalizeInspectionPreScan({
        inspection_decision_source: "model",
      }),
    /inspection_decision_source must be one of ai, protocol_pre_scan/i,
  );
});

test("assertInspectionDecisionPayload enforces protocol-spoiled invariants", () => {
  assert.doesNotThrow(() =>
    assertInspectionDecisionPayload({
      classification: "spoiled",
      inspection_decision_source: "protocol_pre_scan",
      protocol_spoiled_reason: "failed_pre_scan_safety_protocol",
    } as any),
  );

  assert.throws(
    () =>
      assertInspectionDecisionPayload({
        classification: "fresh",
        inspection_decision_source: "protocol_pre_scan",
        protocol_spoiled_reason: "failed_pre_scan_safety_protocol",
      } as any),
    /protocol_pre_scan inspections must use classification spoiled/i,
  );

  assert.throws(
    () =>
      assertInspectionDecisionPayload({
        classification: "fresh",
        inspection_decision_source: "ai",
        protocol_spoiled_reason: "failed_pre_scan_safety_protocol",
      } as any),
    /protocol_spoiled_reason must be null when inspection_decision_source is ai/i,
  );
});

test("mergeInspectionPreScanFields only appends defined fields", () => {
  assert.deepEqual(
    mergeInspectionPreScanFields(
      {
        classification: "spoiled",
      },
      {
        stall_number: "12-A",
        storage_correct: false,
        light_color_correct: false,
        light_color_observed: "green",
      } as any,
    ),
    {
      classification: "spoiled",
      stall_number: "12-A",
      storage_correct: false,
      light_color_correct: false,
      light_color_observed: "green",
    },
  );
});
