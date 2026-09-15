import assert from "node:assert/strict";
import { test } from "node:test";
import { SupabaseModelAccuracyRepository } from "../../../src/modules/model-accuracy/infrastructure/SupabaseModelAccuracyRepository";

type QueryResult = { data: unknown; error: { code?: string; message: string } | null };

class FakeQuery implements PromiseLike<QueryResult> {
  readonly calls: Array<{ method: string; args: unknown[] }> = [];
  constructor(private readonly result: QueryResult) {}
  select(...args: unknown[]): this { this.calls.push({ method: "select", args }); return this; }
  insert(...args: unknown[]): this { this.calls.push({ method: "insert", args }); return this; }
  eq(...args: unknown[]): this { this.calls.push({ method: "eq", args }); return this; }
  gte(...args: unknown[]): this { this.calls.push({ method: "gte", args }); return this; }
  lte(...args: unknown[]): this { this.calls.push({ method: "lte", args }); return this; }
  order(...args: unknown[]): this { this.calls.push({ method: "order", args }); return this; }
  single(...args: unknown[]): this { this.calls.push({ method: "single", args }); return this; }
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

test("repository writes import metadata and normalized calibration samples", async () => {
  const importQuery = new FakeQuery({
    data: {
      id: "import-1",
      source_hash: "a".repeat(64),
      model_version_key: "model-a",
      sample_count: 1,
      imported_by: "admin-1",
      imported_at: "2026-09-15T00:00:00.000Z",
    },
    error: null,
  });
  const sampleQuery = new FakeQuery({ data: [], error: null });
  const queries = new Map([
    ["model_calibration_imports", importQuery],
    ["model_calibration_samples", sampleQuery],
  ]);
  const repository = new SupabaseModelAccuracyRepository({ from: (table: string) => queries.get(table) ?? sampleQuery });

  const result = await repository.importCalibrationPackage({
    sourceHash: "a".repeat(64),
    modelVersionKey: "model-a",
    importedBy: "admin-1",
    predictions: [{
      sampleId: "sample-1",
      groundTruth: "fresh",
      predictedClass: "fresh",
      confidence: 0.8,
      probabilities: { fresh: 0.8, spoiled: 0.2 },
      modelVersionKey: "model-a",
    }],
  });

  assert.equal(result.sampleCount, 1);
  assert.equal(importQuery.calls[0].method, "insert");
  assert.deepEqual(sampleQuery.calls[0], {
    method: "insert",
    args: [[{
      import_id: "import-1",
      sample_id: "sample-1",
      ground_truth: "fresh",
      predicted_class: "fresh",
      confidence: 0.8,
      probabilities: { fresh: 0.8, spoiled: 0.2 },
      model_version_key: "model-a",
    }]],
  });
});

test("repository maps filtered samples, field disputes, and actual model metadata", async () => {
  const queries = new Map<string, FakeQuery>([
    ["model_calibration_samples", new FakeQuery({
      data: [{ sample_id: "s1", ground_truth: "fresh", predicted_class: "spoiled", confidence: 0.9, probabilities: { fresh: 0.1, spoiled: 0.9 }, model_version_key: "model-a" }],
      error: null,
    })],
    ["inspections", new FakeQuery({
      data: [{
        id: "inspection-1",
        classification: "fresh",
        confidence_score: 0.9,
        model_versions: { version_key: "model-a" },
        inspection_result_disputes: [{ status: "approved", created_at: "2026-09-01T00:00:00.000Z", reviewed_at: "2026-09-02T00:00:00.000Z", expected_classification: "spoiled" }],
      }],
      error: null,
    })],
  ]);
  const classQuery = new FakeQuery({ data: [{ ground_truth: "fresh", predicted_class: "spoiled" }], error: null });
  const modelQuery = new FakeQuery({ data: [{ version_key: "model-a", display_name: "Primary" }], error: null });
  queries.set("classes", classQuery);
  queries.set("models", modelQuery);
  const repository = new SupabaseModelAccuracyRepository({
    from: (table: string) => table === "model_calibration_samples"
      ? queries.get("model_calibration_samples")!
      : table === "inspections"
        ? queries.get("inspections")!
        : table === "model_versions"
          ? queries.get("models")!
          : queries.get("classes")!,
  });

  const result = await repository.getCalibrationInputs({ modelVersionKey: "model-a", className: null });
  assert.equal(result.predictions[0].predictedClass, "spoiled");
  assert.equal(result.fieldObservations[0].originalPrediction, "fresh");
  assert.equal(result.fieldObservations[0].originalConfidence, 0.9);
  assert.equal(result.fieldObservations[0].disputeStatus, "approved");
  assert.deepEqual(result.availableClasses, ["fresh", "spoiled"]);
  assert.deepEqual(result.availableModelVersions, [{ versionKey: "model-a", displayName: "Primary" }]);
  assert.deepEqual(queries.get("model_calibration_samples")!.calls.find((call) => call.method === "eq"), {
    method: "eq",
    args: ["model_version_key", "model-a"],
  });
});

test("repository maps duplicate calibration source hashes to a stable error", async () => {
  const query = new FakeQuery({ data: null, error: { code: "23505", message: "duplicate source hash" } });
  const repository = new SupabaseModelAccuracyRepository({ from: () => query });
  await assert.rejects(
    repository.importCalibrationPackage({ sourceHash: "a".repeat(64), modelVersionKey: null, importedBy: "admin-1", predictions: [] }),
    /already been imported/i,
  );
});
