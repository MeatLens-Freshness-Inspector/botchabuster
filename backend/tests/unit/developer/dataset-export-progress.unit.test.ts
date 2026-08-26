import assert from "node:assert/strict";
import test from "node:test";
import type { Inspection } from "../../../src/types/inspection";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function createInspection(): Inspection {
  return {
    id: "inspection-progress",
    user_id: "user-1",
    meat_type: "pork",
    classification: "fresh",
    manual_classification: "fresh",
    confidence_score: 0.94,
    flagged_deviations: [],
    explanation: null,
    image_url: null,
    location: null,
    location_latitude: null,
    location_longitude: null,
    stall_number: null,
    meat_inspection_certificate_proof: null,
    meat_expiry_date: null,
    storage_correct: null,
    light_color_correct: null,
    light_color_observed: null,
    area_clean: null,
    inspection_decision_source: "ai",
    protocol_spoiled_reason: null,
    inspector_notes: null,
    client_submission_id: "client-progress",
    captured_at: "2026-08-26T00:00:00.000Z",
    created_at: "2026-08-26T00:00:00.000Z",
    updated_at: "2026-08-26T00:00:00.000Z",
  };
}

test("dataset export sessions expose progress and reject another owner", async () => {
  const { developerDashboardService } = await import("../../../src/modules/developer/infrastructure/DeveloperDashboardService");
  const { inspectionService } = await import("../../../src/modules/inspections/infrastructure/InspectionService");
  const originalGetDeveloperDatasetExportRows = inspectionService.getDeveloperDatasetExportRows;
  const rows = deferred<Inspection[]>();

  inspectionService.getDeveloperDatasetExportRows = async () => rows.promise;

  try {
    const session = developerDashboardService.startDatasetExportSession(
      { limit: 100, offset: 0 },
      "owner-1",
    );

    assert.match(session.exportId, /^[0-9a-f-]{36}$/);
    assert.deepEqual(
      developerDashboardService.getDatasetExportProgress(session.exportId, "owner-1"),
      {
        status: "running",
        stage: "querying",
        current: 0,
        total: 1,
      },
    );
    assert.throws(
      () => developerDashboardService.getDatasetExportProgress(session.exportId, "another-owner"),
      /not authorized/,
    );

    rows.resolve([createInspection()]);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const progress = developerDashboardService.getDatasetExportProgress(session.exportId, "owner-1");
      if (progress.status === "completed") {
        assert.equal(progress.stage, "complete");
        assert.equal(progress.current, 1);
        assert.equal(progress.total, 1);
        assert.ok(developerDashboardService.getDatasetExportBuffer(session.exportId, "owner-1").buffer.length > 0);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    assert.fail("dataset export session did not complete");
  } finally {
    inspectionService.getDeveloperDatasetExportRows = originalGetDeveloperDatasetExportRows;
  }
});
