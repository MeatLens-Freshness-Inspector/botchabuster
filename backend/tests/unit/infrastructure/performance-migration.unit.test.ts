import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260810090000_backend_query_support.sql",
);

test("query-support migration adds indexes for bounded high-volume reads", () => {
  const sql = readFileSync(migrationPath, "utf8").toLowerCase();

  for (const marker of [
    "inspections_user_created_id_idx",
    "user_sessions_user_expires_idx",
    "passkey_credentials_user_created_idx",
    "audit_logs_created_id_idx",
    "user_chat_messages_pair_created_id_idx",
  ]) {
    assert.match(sql, new RegExp(marker));
  }
});

test("query-support migration exposes only service-role aggregate functions", () => {
  const sql = readFileSync(migrationPath, "utf8").toLowerCase();

  for (const functionName of [
    "get_landing_page_stats",
    "get_inspection_classification_stats",
    "get_in_app_model_metrics",
    "get_user_chat_contact_summary",
  ]) {
    assert.match(sql, new RegExp(`create or replace function public\\.${functionName}`));
    assert.match(sql, new RegExp(`grant execute on function public\\.${functionName}`));
  }

  assert.match(sql, /set search_path\s*=\s*public/);
});
