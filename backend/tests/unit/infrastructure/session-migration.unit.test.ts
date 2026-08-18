import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260818090000_add_session_last_seen.sql",
);

test("session migration adds and indexes last_seen_at with a safe backfill", () => {
  const sql = readFileSync(migrationPath, "utf8").toLowerCase();

  assert.match(sql, /add column\s+last_seen_at\s+timestamptz/);
  assert.match(sql, /set last_seen_at\s*=\s*created_at/);
  assert.match(sql, /alter column\s+last_seen_at\s+set default\s+now\(\)/);
  assert.match(sql, /alter column\s+last_seen_at\s+set not null/);
  assert.match(sql, /create index\s+user_sessions_last_seen_at_idx/);
});
