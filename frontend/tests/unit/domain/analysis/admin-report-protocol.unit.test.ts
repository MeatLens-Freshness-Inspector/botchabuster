import assert from "node:assert/strict";
import test from "node:test";
import { buildPreScanReportFields } from "../../../../src/pages/admin-dashboard/utils/adminDashboard";
import type { Inspection } from "../../../../src/types/inspection";

test("buildPreScanReportFields converts nullable protocol fields into export-friendly strings", () => {
  const inspection: Pick<
    Inspection,
    | "stall_number"
    | "meat_inspection_certificate_proof"
    | "meat_expiry_date"
    | "storage_correct"
    | "light_color_correct"
    | "light_color_observed"
    | "area_clean"
    | "inspection_decision_source"
    | "protocol_spoiled_reason"
  > = {
    stall_number: "12-A",
    meat_inspection_certificate_proof: "CERT-77",
    meat_expiry_date: "2026-07-10",
    storage_correct: false,
    light_color_correct: false,
    light_color_observed: "green",
    area_clean: true,
    inspection_decision_source: "protocol_pre_scan",
    protocol_spoiled_reason: "failed_pre_scan_safety_protocol",
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
      decisionSource: "Pre-scan protocol",
      protocolSpoiledReason: "failed_pre_scan_safety_protocol",
    },
  );
});
