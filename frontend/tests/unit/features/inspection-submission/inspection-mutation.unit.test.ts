import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInspectionInsert,
  type InspectionSubmissionInput,
} from "../../../../src/entities/inspection/model/mutations";

const submission: InspectionSubmissionInput = {
  userId: "user-1",
  submissionId: "submission-1",
  capturedAt: "2026-08-11T10:00:00.000Z",
  location: "Market A",
  coordinates: { latitude: 14.6, longitude: 120.98 },
  decisionSource: "protocol_pre_scan",
  imageUrl: "https://cdn.example.test/image.jpg",
  preScanForm: {
    stallNumber: "12",
    meatInspectionCertificateProof: "certificate.jpg",
    meatExpiryDate: "2026-08-20",
    storageCorrect: "no",
    lightColorCorrect: "yes",
    lightColorObserved: "",
    areaClean: "yes",
  },
  result: {
    classification: "spoiled",
    confidence_score: 100,
    flagged_deviations: ["storage"],
    explanation: "Protocol failure",
  },
};

test("buildInspectionInsert preserves the submission payload and protocol metadata", () => {
  assert.deepEqual(buildInspectionInsert(submission), {
    user_id: "user-1",
    client_submission_id: "submission-1",
    meat_type: "pork",
    location: "Market A",
    location_latitude: 14.6,
    location_longitude: 120.98,
    stall_number: "12",
    meat_inspection_certificate_proof: "certificate.jpg",
    meat_expiry_date: "2026-08-20",
    storage_correct: false,
    light_color_correct: true,
    light_color_observed: null,
    area_clean: true,
    regulatory_compliance: false,
    inspection_decision_source: "protocol_pre_scan",
    protocol_spoiled_reason: "failed_pre_scan_safety_protocol",
    captured_at: "2026-08-11T10:00:00.000Z",
    classification: "spoiled",
    confidence_score: 100,
    flagged_deviations: ["storage"],
    explanation: "Protocol failure",
    image_url: "https://cdn.example.test/image.jpg",
  });
});

test("buildInspectionInsert normalizes empty location and omits protocol reason for AI", () => {
  const result = buildInspectionInsert({
    ...submission,
    location: "   ",
    decisionSource: "ai",
    preScanForm: {
      ...submission.preScanForm,
      storageCorrect: "yes",
    },
    result: {
      ...submission.result,
      classification: "fresh",
      confidence_score: 94,
    },
  });

  assert.equal(result.location, null);
  assert.equal(result.regulatory_compliance, true);
  assert.equal(result.protocol_spoiled_reason, null);
  assert.equal(result.inspection_decision_source, "ai");
});

test("buildInspectionInsert carries the model version key from the analysis result", () => {
  const result = buildInspectionInsert({
    ...submission,
    decisionSource: "ai",
    result: {
      ...submission.result,
      classification: "fresh",
      confidence_score: 91,
      model_version_key: "mobilenet-primary-2026-08-13",
    },
  });

  assert.equal(result.model_version_key, "mobilenet-primary-2026-08-13");
});
