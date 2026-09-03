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
const modelRegistrationMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260904090000_register_analysis_model_versions.sql",
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

test("analysis model registration migration registers every selectable model version", () => {
  const sql = readFileSync(modelRegistrationMigrationPath, "utf8").toLowerCase();

  for (const versionKey of [
    "mobilenet-primary-2026-08-13",
    "mobilenet-seed123-model2-2026-05-19",
    "mobilenet-legacy-2026-05-05",
    "resnet50-2026-05-01",
    "ensemble-2026-08-26",
  ]) {
    assert.match(sql, new RegExp(`'${versionKey}'`));
  }

  assert.match(sql, /insert into public\.model_versions/);
  assert.match(sql, /on conflict \(version_key\) do nothing/);
});
