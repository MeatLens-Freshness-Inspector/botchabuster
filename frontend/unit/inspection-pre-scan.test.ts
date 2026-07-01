import assert from "node:assert/strict";
import test from "node:test";
import {
  PROTOCOL_SPOILED_REASON,
  buildProtocolSpoiledAnalysisResult,
  createEmptyPreScanForm,
  getInspectionDecisionSource,
  hasProtocolFailure,
  isPreScanChecklistComplete,
  toInspectionPreScanPayload,
} from "../src/lib/inspectionPreScan";

test("isPreScanChecklistComplete requires all fields and observed light color when the light is incorrect", () => {
  const incomplete = createEmptyPreScanForm();
  assert.equal(isPreScanChecklistComplete(incomplete), false);

  const complete = {
    stallNumber: "12-A",
    meatInspectionCertificateProof: "CERT-77",
    meatExpiryDate: "2026-07-10",
    storageCorrect: "yes" as const,
    lightColorCorrect: "no" as const,
    lightColorObserved: "green",
    areaClean: "yes" as const,
  };

  assert.equal(isPreScanChecklistComplete(complete), true);
  assert.equal(
    isPreScanChecklistComplete({
      ...complete,
      lightColorObserved: " ",
    }),
    false,
  );
});

test("hasProtocolFailure and getInspectionDecisionSource follow the yes-no protocol checks", () => {
  const safeForm = {
    stallNumber: "12-A",
    meatInspectionCertificateProof: "CERT-77",
    meatExpiryDate: "2026-07-10",
    storageCorrect: "yes" as const,
    lightColorCorrect: "yes" as const,
    lightColorObserved: "",
    areaClean: "yes" as const,
  };

  assert.equal(hasProtocolFailure(safeForm), false);
  assert.equal(getInspectionDecisionSource(safeForm), "ai");

  const failedForm = {
    ...safeForm,
    areaClean: "no" as const,
  };

  assert.equal(hasProtocolFailure(failedForm), true);
  assert.equal(getInspectionDecisionSource(failedForm), "protocol_pre_scan");
});

test("buildProtocolSpoiledAnalysisResult produces the forced-spoiled payload and toInspectionPreScanPayload normalizes field names", () => {
  assert.deepEqual(buildProtocolSpoiledAnalysisResult(), {
    classification: "spoiled",
    confidence_score: 100,
    flagged_deviations: [PROTOCOL_SPOILED_REASON],
    explanation:
      "Automatically classified as spoiled due to failed pre-scan safety protocol. AI analysis was skipped.",
  });

  assert.deepEqual(
    toInspectionPreScanPayload({
      stallNumber: " 12-A ",
      meatInspectionCertificateProof: " CERT-77 ",
      meatExpiryDate: "2026-07-10",
      storageCorrect: "no",
      lightColorCorrect: "no",
      lightColorObserved: " green ",
      areaClean: "yes",
    }),
    {
      stall_number: "12-A",
      meat_inspection_certificate_proof: "CERT-77",
      meat_expiry_date: "2026-07-10",
      storage_correct: false,
      light_color_correct: false,
      light_color_observed: "green",
      area_clean: true,
    },
  );
});
