import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260824150000_add_inspection_result_disputes.sql",
);

test("inspection dispute migration preserves model results and adds an approval boundary", () => {
  const sql = readFileSync(migrationPath, "utf8").toLowerCase();

  assert.match(sql, /add column if not exists official_classification/);
  assert.match(sql, /create table if not exists public\.inspection_result_disputes/);
  assert.match(sql, /status text not null default 'pending'/);
  assert.match(sql, /char_length\(btrim\(reason\)\) between 10 and 2000/);
  assert.match(sql, /create unique index if not exists inspection_result_disputes_one_pending/);
  assert.match(sql, /apply_inspection_dispute_to_developer_dataset/);
  assert.match(sql, /review_inspection_result_dispute/);
  assert.match(sql, /set manual_classification = v_dispute\.expected_classification/);
  assert.match(sql, /set official_classification = v_dispute\.expected_classification/);
  assert.match(sql, /create policy "service role manages inspection result disputes"/);
  assert.match(sql, /for all to service_role/);
  assert.match(sql, /revoke all on function public\.review_inspection_result_dispute/);
});
