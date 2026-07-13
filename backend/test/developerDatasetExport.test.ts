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
    manual_classification: "fresh",
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
    assert.match(csv, /^date,meat,manual classification,confidence,image file$/m);
    assert.match(csv, /"2026-07-13","pork","fresh","0.94","inspection-with-image\.jpg"/);
    assert.doesNotMatch(csv, /source_classification/);
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

test("dataset export downloads images concurrently", async () => {
  const { developerDashboardService } = await import("../src/services/DeveloperDashboardService");
  const { inspectionService } = await import("../src/services/InspectionService");
  const originalGetDeveloperDatasetPage = (inspectionService as unknown as {
    getDeveloperDatasetPage?: typeof developerDashboardService.listDatasets;
  }).getDeveloperDatasetPage;
  const originalFetch = globalThis.fetch;

  (inspectionService as unknown as {
    getDeveloperDatasetPage: typeof developerDashboardService.listDatasets;
  }).getDeveloperDatasetPage = async (filters) => {
    assert.equal(filters.limit, 10_000);
    assert.equal(filters.offset, 0);

    return {
      items: [
        createInspection({
          id: "inspection-a",
          image_url: "https://example.com/a.jpg",
        }),
        createInspection({
          id: "inspection-b",
          image_url: "https://example.com/b.jpg",
        }),
        createInspection({
          id: "inspection-c",
          image_url: "https://example.com/c.jpg",
        }),
      ],
      total: 3,
      limit: filters.limit,
      offset: filters.offset,
    };
  };

  let activeFetches = 0;
  let maxActiveFetches = 0;
  globalThis.fetch = async () => {
    activeFetches += 1;
    maxActiveFetches = Math.max(maxActiveFetches, activeFetches);
    await new Promise((resolve) => setTimeout(resolve, 50));
    activeFetches -= 1;
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "Content-Type": "image/jpeg" },
    });
  };

  try {
    await developerDashboardService.exportDatasetZip({
      limit: 50,
      offset: 0,
      hasImage: true,
    });

    assert.ok(maxActiveFetches > 1, `expected concurrent image downloads, got ${maxActiveFetches}`);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalGetDeveloperDatasetPage) {
      (inspectionService as unknown as {
        getDeveloperDatasetPage: typeof developerDashboardService.listDatasets;
      }).getDeveloperDatasetPage = originalGetDeveloperDatasetPage;
    } else {
      delete (inspectionService as unknown as { getDeveloperDatasetPage?: unknown }).getDeveloperDatasetPage;
    }
  }
});

test("dataset export uses stored manual classifications", async () => {
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
          id: "inspection-a",
          classification: "fresh",
          manual_classification: "spoiled",
          image_url: "data:image/jpeg;base64,aW1hZ2UtYnl0ZXM=",
        }),
        createInspection({
          id: "inspection-b",
          classification: "warning",
          manual_classification: "warning",
        }),
      ],
      total: 2,
      limit: filters.limit,
      offset: filters.offset,
    };
  };

  try {
    const exported = await developerDashboardService.exportDatasetZip(
      {
        limit: 50,
        offset: 0,
        hasImage: true,
      },
    );
    const zipEntries = unzipSync(new Uint8Array(exported.buffer));
    const csv = Buffer.from(zipEntries["inspections.csv"]).toString("utf-8");
    const overriddenRow = csv.split("\n").find((line) => line.includes("\"spoiled\""));

    assert.ok(overriddenRow);
    assert.match(csv, /^date,meat,manual classification,confidence,image file$/m);
    assert.match(overriddenRow, /"2026-07-13","pork","spoiled","0.94","inspection-a\.jpg"/);
    assert.doesNotMatch(csv, /source_classification/);

    const manifest = JSON.parse(Buffer.from(zipEntries["manifest.json"]).toString("utf-8")) as {
      rowsMissingImages: string[];
    };
    assert.deepEqual(manifest.rowsMissingImages, ["inspection-b"]);
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

test("inspection service persists manual classification changes", async () => {
  const { inspectionService } = await import("../src/services/InspectionService");
  const { supabase } = await import("../src/integrations/supabase");
  const supabaseClient = supabase as any;
  const originalFrom = supabaseClient.from;
  let updatePayload: unknown = null;
  let updateTarget: Array<[string, unknown]> = [];

  supabaseClient.from = ((tableName: string) => {
    assert.equal(tableName, "inspections");
    const chain = {
      update(payload: unknown) {
        updatePayload = payload;
        return chain;
      },
      eq(column: string, value: unknown) {
        updateTarget.push([column, value]);
        return chain;
      },
      select() {
        return chain;
      },
      async single() {
        return {
          data: createInspection({
            id: "inspection-a",
            classification: "fresh",
            manual_classification: "spoiled",
          }),
          error: null,
        };
      },
    };

    return chain;
  }) as typeof supabase.from;

  try {
    const updatedInspection = await inspectionService.updateManualClassification("inspection-a", "spoiled");

    assert.equal(updatedInspection.manual_classification, "spoiled");
    assert.deepEqual(updateTarget, [["id", "inspection-a"]]);
    const payload = updatePayload as Record<string, unknown>;
    assert.equal(payload.manual_classification, "spoiled");
    assert.equal(typeof payload.updated_at, "string");
  } finally {
    supabaseClient.from = originalFrom;
  }
});
