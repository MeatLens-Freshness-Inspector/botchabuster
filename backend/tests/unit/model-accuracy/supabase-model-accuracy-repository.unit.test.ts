import assert from "node:assert/strict";
import { test } from "node:test";
import { SupabaseModelAccuracyRepository } from "../../../src/modules/model-accuracy/infrastructure/SupabaseModelAccuracyRepository";

type QueryResult = { data: unknown; error: { code?: string; message: string } | null };

class FakeQuery implements PromiseLike<QueryResult> {
  readonly calls: Array<{ method: string; args: unknown[] }> = [];
  private result: QueryResult = { data: null, error: null };

  select(...args: unknown[]): this { this.calls.push({ method: "select", args }); return this; }
  insert(...args: unknown[]): this { this.calls.push({ method: "insert", args }); return this; }
  gte(...args: unknown[]): this { this.calls.push({ method: "gte", args }); return this; }
  lte(...args: unknown[]): this { this.calls.push({ method: "lte", args }); return this; }
  order(...args: unknown[]): this { this.calls.push({ method: "order", args }); return this; }
  single(...args: unknown[]): this { this.calls.push({ method: "single", args }); return this; }
  resolve(result: QueryResult): this { this.result = result; return this; }
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

test("repository maps joined snapshot rows and orders by date then version key", async () => {
  const query = new FakeQuery().resolve({
    data: [
      {
        id: "snapshot-2",
        model_version_id: "model-2",
        snapshot_date: "2026-08-26",
        expected_accuracy: 0.91,
        observed_accuracy: null,
        evaluated_count: 0,
        correct_count: 0,
        created_at: "2026-08-27T00:00:00.000Z",
        model_versions: { version_key: "b-version", display_name: "B" },
      },
      {
        id: "snapshot-1",
        model_version_id: "model-1",
        snapshot_date: "2026-08-25",
        expected_accuracy: 0.92,
        observed_accuracy: 0.875,
        evaluated_count: 16,
        correct_count: 14,
        created_at: "2026-08-26T00:00:00.000Z",
        model_versions: { version_key: "a-version", display_name: "A" },
      },
    ],
    error: null,
  });
  const repository = new SupabaseModelAccuracyRepository({
    from: () => query,
  });

  assert.deepEqual(await repository.getHistory({ startDate: "2026-08-01", endDate: "2026-08-31" }), [
    {
      id: "snapshot-1",
      modelVersionId: "model-1",
      versionKey: "a-version",
      displayName: "A",
      snapshotDate: "2026-08-25",
      expectedAccuracy: 0.92,
      observedAccuracy: 0.875,
      evaluatedCount: 16,
      correctCount: 14,
      createdAt: "2026-08-26T00:00:00.000Z",
    },
    {
      id: "snapshot-2",
      modelVersionId: "model-2",
      versionKey: "b-version",
      displayName: "B",
      snapshotDate: "2026-08-26",
      expectedAccuracy: 0.91,
      observedAccuracy: null,
      evaluatedCount: 0,
      correctCount: 0,
      createdAt: "2026-08-27T00:00:00.000Z",
    },
  ]);
  assert.deepEqual(query.calls.slice(0, 1), [{
    method: "select",
    args: ["id, model_version_id, snapshot_date, expected_accuracy, observed_accuracy, evaluated_count, correct_count, created_at, model_versions!inner(version_key, display_name)"],
  }]);
});

test("repository maps duplicate model keys to a stable domain error", async () => {
  const query = new FakeQuery().resolve({
    data: null,
    error: { code: "23505", message: "duplicate key value violates unique constraint" },
  });
  const repository = new SupabaseModelAccuracyRepository({ from: () => query });

  await assert.rejects(
    repository.registerModelVersion({
      versionKey: "v1",
      displayName: "Version 1",
      expectedAccuracy: 0.9,
      activeFrom: "2026-08-26T00:00:00.000Z",
      createdBy: "user-1",
    }),
    /model version key already exists/i,
  );
});
