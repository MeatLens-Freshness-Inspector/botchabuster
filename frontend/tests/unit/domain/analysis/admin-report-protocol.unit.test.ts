import assert from "node:assert/strict";
import test from "node:test";
import { buildPreScanReportFields } from "../../../../src/widgets/admin-dashboard";
import type { Inspection } from "../../../../src/entities/inspection";

test("buildPreScanReportFields converts nullable protocol fields into export-friendly strings", () => {
  const inspection: Pick<
    Inspection,
    | "created_at"
    | "stall_number"
    | "meat_inspection_certificate_proof"
    | "meat_expiry_date"
    | "storage_correct"
    | "light_color_correct"
    | "light_color_observed"
    | "area_clean"
    | "inspection_decision_source"
    | "protocol_spoiled_reason"
    | "regulatory_compliance"
  > = {
    created_at: "2026-08-06T00:00:00.000Z",
    stall_number: "12-A",
    meat_inspection_certificate_proof: "CERT-77",
    meat_expiry_date: "2026-07-10",
    storage_correct: false,
    light_color_correct: false,
    light_color_observed: "green",
    area_clean: true,
    inspection_decision_source: "protocol_pre_scan",
    protocol_spoiled_reason: "failed_pre_scan_safety_protocol",
    regulatory_compliance: false,
  };

  assert.deepEqual(
    buildPreScanReportFields(inspection),
    {
      stallNumber: "12-A",
      certificateProof: "CERT-77",
      meatExpiryDate: "2026-07-10",
      storageCorrect: "No",
      lightColorCorrect: "No",
      lightColorObserved: "green",
      areaClean: "Yes",
      regulatoryCompliance: "Non-Compliant",
      decisionSource: "Pre-scan protocol",
      protocolSpoiledReason: "failed_pre_scan_safety_protocol",
    },
  );
});

test("buildPreScanReportFields marks pre-feature inspections as unavailable", () => {
  const inspection = {
    created_at: "2026-08-04T23:59:59.000Z",
    regulatory_compliance: true,
    storage_correct: true,
    light_color_correct: true,
    light_color_observed: null,
    area_clean: true,
    stall_number: null,
    meat_inspection_certificate_proof: null,
    meat_expiry_date: null,
    inspection_decision_source: null,
    protocol_spoiled_reason: null,
  };

  assert.equal(buildPreScanReportFields(inspection).regulatoryCompliance, "Not available");
});

test("buildPreScanReportFields includes compliance on the feature date", () => {
  const inspection = {
    created_at: "2026-08-05T00:00:00.000Z",
    regulatory_compliance: true,
    storage_correct: true,
    light_color_correct: true,
    light_color_observed: null,
    area_clean: true,
    stall_number: null,
    meat_inspection_certificate_proof: null,
    meat_expiry_date: null,
    inspection_decision_source: null,
    protocol_spoiled_reason: null,
  };

  assert.equal(buildPreScanReportFields(inspection).regulatoryCompliance, "Compliant");
});

test("buildPreScanReportFields keeps post-feature missing compliance distinct", () => {
  const inspection = {
    created_at: "2026-08-06T00:00:00.000Z",
    regulatory_compliance: null,
    storage_correct: null,
    light_color_correct: null,
    light_color_observed: null,
    area_clean: null,
    stall_number: null,
    meat_inspection_certificate_proof: null,
    meat_expiry_date: null,
    inspection_decision_source: null,
    protocol_spoiled_reason: null,
  };

  assert.equal(buildPreScanReportFields(inspection).regulatoryCompliance, "Not Recorded");
});
