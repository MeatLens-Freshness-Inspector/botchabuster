import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260820010000_enable_user_chat_realtime.sql",
);

test("chat realtime migration idempotently publishes message inserts without browser grants", () => {
  const sql = readFileSync(migrationPath, "utf8").toLowerCase();

  assert.match(sql, /pg_publication_tables/);
  assert.match(sql, /alter publication supabase_realtime add table public\.user_chat_messages/);
  assert.doesNotMatch(sql, /grant\s+.*\b(?:anon|authenticated)\b/);
});
