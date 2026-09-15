import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCalibrationImportAuditPayload } from "../../../src/modules/model-accuracy/presentation/routes";

test("calibration import audit payload records actor, source, model, and sample count without row data", () => {
  const payload = buildCalibrationImportAuditPayload(
    { userId: "admin-1", primaryRole: "admin" } as never,
    {
      id: "import-1",
      sourceHash: "a".repeat(64),
      modelVersionKey: "model-a",
      sampleCount: 25,
      importedBy: "admin-1",
      importedAt: "2026-09-15T00:00:00.000Z",
    },
  );

  assert.equal(payload.event_type, "model.calibration.imported");
  assert.deepEqual(payload.actor, { id: "admin-1", role: "admin" });
  assert.deepEqual(payload.data, {
    import_id: "import-1",
    source_hash: "a".repeat(64),
    model_version_key: "model-a",
    sample_count: 25,
  });
  assert.equal("predictions" in payload.data, false);
});
