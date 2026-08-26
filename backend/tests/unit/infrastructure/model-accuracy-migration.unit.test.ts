import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260826180000_add_model_accuracy_history.sql",
);

test("model accuracy migration creates versioned immutable daily snapshots", () => {
  const sql = readFileSync(migrationPath, "utf8").toLowerCase();

  assert.match(sql, /create table if not exists public\.model_versions/);
  assert.match(sql, /expected_accuracy numeric\(5,4\)/);
  assert.match(sql, /create table if not exists public\.model_accuracy_snapshots/);
  assert.match(sql, /add column if not exists model_version_id/);
  assert.match(sql, /unique \(model_version_id, snapshot_date\)/);
  assert.match(sql, /correct_count <= evaluated_count/);
  assert.match(sql, /official_classification is not null/);
  assert.match(sql, /on conflict \(model_version_id, snapshot_date\) do nothing/);
  assert.match(sql, /capture_model_accuracy_snapshots/);
  assert.match(sql, /at time zone 'utc'/);
  assert.match(sql, /enable row level security/);
});
