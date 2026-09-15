import assert from "node:assert/strict";
import test from "node:test";
import { modelAccuracyClient } from "../../../src/entities/model-accuracy/api/model-accuracy-client";
import { installEncryptedFetch } from "../../support/encrypted-fetch";

const emptyAnalytics = {
  filters: { modelVersionKey: null, className: null },
  availableClasses: ["fresh"],
  availableModelVersions: [],
  controlled: {
    sampleCount: 0,
    ece: null,
    brierScore: null,
    reliabilityBins: [],
    confidenceDistribution: [],
    perClass: [],
  },
  fieldMonitoring: { buckets: [], highConfidenceApprovedDisputes: [] },
};

test("calibration analytics client sends optional model and class filters", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const restoreTransportFetch = installEncryptedFetch(({ input, init }) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify(emptyAnalytics), { status: 200 });
  });

  try {
    const response = await modelAccuracyClient.getCalibrationAnalytics("mobilenet-primary-2026-08-13", "fresh");
    assert.equal(response.controlled.sampleCount, 0);
  } finally {
    restoreTransportFetch();
  }

  assert.match(requestUrl, /\/api\/model-accuracy\/calibration\?modelVersionKey=mobilenet-primary-2026-08-13&className=fresh$/);
  assert.equal(new Headers(requestInit?.headers).get("Authorization"), null);
  assert.equal(requestInit?.credentials, "include");
});

test("calibration analytics client rejects malformed responses", async () => {
  const restoreTransportFetch = installEncryptedFetch(() => new Response(JSON.stringify({ controlled: {} }), { status: 200 }));
  try {
    await assert.rejects(modelAccuracyClient.getCalibrationAnalytics(), /invalid model calibration analytics/i);
  } finally {
    restoreTransportFetch();
  }
});

test("calibration package import uses the existing authenticated multipart transport", async () => {
  let requestInit: RequestInit | undefined;
  let logicalPayload: { kind?: string; files?: Array<{ fieldName: string; fileName: string }> } | null = null;
  const restoreTransportFetch = installEncryptedFetch(({ init, logicalPayload: payload }) => {
    requestInit = init;
    logicalPayload = payload;
    return new Response(JSON.stringify({ id: "import-1" }), { status: 201 });
  });

  try {
    await modelAccuracyClient.importCalibrationPackage(new File(["zip"], "calibration-package.zip", { type: "application/zip" }));
  } finally {
    restoreTransportFetch();
  }

  assert.equal(requestInit?.method, "POST");
  assert.equal(logicalPayload?.kind, "form-data");
  assert.deepEqual(logicalPayload?.files, [{
    fieldName: "package",
    fileName: "calibration-package.zip",
    mimeType: "application/zip",
    size: 3,
    bytes: "emlw",
  }]);
});
