import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260915100000_add_model_calibration_results.sql",
);

test("calibration migration stores immutable normalized held-out results without raw datasets", () => {
  const sql = readFileSync(migrationPath, "utf8").toLowerCase();

  assert.match(sql, /create table if not exists public\.model_calibration_imports/);
  assert.match(sql, /create table if not exists public\.model_calibration_samples/);
  assert.match(sql, /source_hash text not null unique/);
  assert.match(sql, /model_version_id uuid/);
  assert.match(sql, /model_version_key text/);
  assert.match(sql, /sample_id text not null/);
  assert.match(sql, /ground_truth text not null/);
  assert.match(sql, /predicted_class text not null/);
  assert.match(sql, /confidence numeric/);
  assert.match(sql, /probabilities jsonb not null/);
  assert.match(sql, /jsonb_typeof\(probabilities\) = 'object'/);
  assert.match(sql, /unique \(import_id, sample_id\)/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public\.model_calibration/);
  assert.match(sql, /grant select, insert on table public\.model_calibration/);
  assert.doesNotMatch(sql, /image_url|image_path|training_dataset_id|raw_training_dataset/);
});
