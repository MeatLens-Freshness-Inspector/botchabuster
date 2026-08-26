import assert from "node:assert/strict";
import test from "node:test";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

test("developer dataset export uses a bounded projection without an exact count", async () => {
  const { inspectionService } = await import("../../../src/modules/inspections/infrastructure/InspectionService");
  const { supabase } = await import("../../../src/integrations/supabase");
  const supabaseClient = supabase as any;
  const originalFrom = supabaseClient.from;
  const calls: Array<[string, ...unknown[]]> = [];
  const rows = [{ id: "inspection-1", image_url: "https://example.com/inspection.jpg" }];

  supabaseClient.from = ((tableName: string) => {
    assert.equal(tableName, "inspections");
    const chain: Record<string, (...args: unknown[]) => unknown> = {
      select: (...args) => {
        calls.push(["select", ...args]);
        return chain;
      },
      eq: (...args) => {
        calls.push(["eq", ...args]);
        return chain;
      },
      ilike: (...args) => {
        calls.push(["ilike", ...args]);
        return chain;
      },
      not: (...args) => {
        calls.push(["not", ...args]);
        return chain;
      },
      is: (...args) => {
        calls.push(["is", ...args]);
        return chain;
      },
      gte: (...args) => {
        calls.push(["gte", ...args]);
        return chain;
      },
      lte: (...args) => {
        calls.push(["lte", ...args]);
        return chain;
      },
      order: (...args) => {
        calls.push(["order", ...args]);
        return chain;
      },
      range: async (...args) => {
        calls.push(["range", ...args]);
        return { data: rows, error: null };
      },
    };
    return chain;
  }) as typeof supabase.from;

  try {
    const result = await inspectionService.getDeveloperDatasetExportRows({
      limit: 100_000,
      offset: 500,
      meatType: "beef",
      classification: "fresh",
      inspector: "inspector-1",
      location: "market",
      hasImage: true,
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
    });

    assert.deepEqual(result, rows);
    assert.deepEqual(calls[0], ["select", "id, meat_type, classification, manual_classification, confidence_score, image_url, captured_at"]);
    assert.equal(calls.some(([name, ...args]) => name === "select" && (args[1] as { count?: string } | undefined)?.count === "exact"), false);
    assert.ok(calls.some(([name, ...args]) => name === "range" && args[0] === 0 && args[1] === 9_999));
    assert.ok(calls.some(([name, ...args]) => name === "eq" && args[0] === "meat_type" && args[1] === "beef"));
  } finally {
    supabaseClient.from = originalFrom;
  }
});
