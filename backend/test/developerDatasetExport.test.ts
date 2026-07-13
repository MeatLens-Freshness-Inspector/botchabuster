import assert from "node:assert/strict";
import test from "node:test";
import { unzipSync } from "fflate";
import type { Inspection } from "../src/types/inspection";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

function createInspection(overrides: Partial<Inspection>): Inspection {
  return {
    id: "inspection-1",
    user_id: "user-1",
    meat_type: "pork",
    classification: "fresh",
    confidence_score: 0.94,
    flagged_deviations: [],
    explanation: null,
    image_url: null,
    location: "Olongapo Public Market",
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
    client_submission_id: "client-1",
    captured_at: "2026-07-13T00:00:00.000Z",
    created_at: "2026-07-13T00:00:00.000Z",
    updated_at: "2026-07-13T00:00:00.000Z",
    ...overrides,
  };
}

test("dataset export ZIP contains manifest, inspections.csv, images, and missing-image warnings", async () => {
  const { developerDashboardService } = await import("../src/services/DeveloperDashboardService");
  const { inspectionService } = await import("../src/services/InspectionService");
  const originalGetDeveloperDatasetPage = (inspectionService as unknown as {
    getDeveloperDatasetPage?: typeof developerDashboardService.listDatasets;
  }).getDeveloperDatasetPage;

  (inspectionService as unknown as {
    getDeveloperDatasetPage: typeof developerDashboardService.listDatasets;
  }).getDeveloperDatasetPage = async (filters) => {
    assert.equal(filters.limit, 10_000);
    assert.equal(filters.offset, 0);

    return {
      items: [
        createInspection({
          id: "inspection-with-image",
          image_url: "data:image/jpeg;base64,aW1hZ2UtYnl0ZXM=",
        }),
        createInspection({
          id: "inspection-without-image",
          image_url: null,
        }),
      ],
      total: 2,
      limit: filters.limit,
      offset: filters.offset,
    };
  };

  try {
    const exported = await developerDashboardService.exportDatasetZip({
      limit: 50,
      offset: 0,
      hasImage: true,
    });
    const zipEntries = unzipSync(new Uint8Array(exported.buffer));

    assert.ok(zipEntries["manifest.json"]);
    assert.ok(zipEntries["inspections.csv"]);
    assert.ok(zipEntries["images/inspection-with-image.jpg"]);

    const manifest = JSON.parse(Buffer.from(zipEntries["manifest.json"]).toString("utf-8")) as {
      rowsMissingImages: string[];
      totalRecordCount: number;
      imageCount: number;
    };
    assert.equal(manifest.totalRecordCount, 2);
    assert.equal(manifest.imageCount, 1);
    assert.deepEqual(manifest.rowsMissingImages, ["inspection-without-image"]);

    const csv = Buffer.from(zipEntries["inspections.csv"]).toString("utf-8");
    assert.match(csv, /inspection-with-image/);
    assert.match(csv, /inspection-without-image/);
  } finally {
    if (originalGetDeveloperDatasetPage) {
      (inspectionService as unknown as {
        getDeveloperDatasetPage: typeof developerDashboardService.listDatasets;
      }).getDeveloperDatasetPage = originalGetDeveloperDatasetPage;
    } else {
      delete (inspectionService as unknown as { getDeveloperDatasetPage?: unknown }).getDeveloperDatasetPage;
    }
  }
});
