import assert from "node:assert/strict";
import test from "node:test";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

test("InspectionService.getInAppModelMetrics computes dataset evaluation metrics", async () => {
  const { InspectionService } = await import("../../../src/modules/inspections/infrastructure/InspectionService");
  const { supabase } = await import("../../../src/integrations/supabase");

  const mockData = [
    { classification: "fresh", manual_classification: "fresh", meat_type: "pork" },
    { classification: "fresh", manual_classification: "spoiled", meat_type: "pork" },
    { classification: "spoiled", manual_classification: "spoiled", meat_type: "beef" },
    { classification: "acceptable", manual_classification: "acceptable", meat_type: "beef" },
  ];

  const originalFrom = supabase.from;
  (supabase as any).from = () => ({
    select: () => ({
      range: () => Promise.resolve({ data: mockData, error: null }),
    }),
  });

  try {
    const service = InspectionService.getInstance();
    const metrics = await service.getInAppModelMetrics();

    assert.equal(metrics.totalEvaluated, 4);
    assert.equal(metrics.correctlyIdentified, 3);
    assert.equal(metrics.incorrectlyIdentified, 1);
    assert.equal(metrics.inAppAccuracy, 0.75);
    assert.equal(metrics.classBreakdown.length, 5);

    const porkBreakdown = metrics.meatTypeBreakdown.find((item) => item.meatType === "pork");
    assert.ok(porkBreakdown);
    assert.equal(porkBreakdown?.totalCount, 2);
    assert.equal(porkBreakdown?.correctCount, 1);
    assert.equal(porkBreakdown?.accuracy, 0.5);
  } finally {
    (supabase as any).from = originalFrom;
  }
});
