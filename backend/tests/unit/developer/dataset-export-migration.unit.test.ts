import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("dataset export history migration provisions private two-day storage", () => {
  const migration = readFileSync(
    join(process.cwd(), "supabase", "migrations", "20261002090000_add_dataset_export_history.sql"),
    "utf8",
  );

  assert.match(migration, /create table if not exists public\.developer_dataset_exports/);
  assert.match(migration, /status text not null check \(status in \('ready', 'expired', 'failed'\)\)/);
  assert.match(migration, /expires_at timestamptz not null/);
  assert.match(migration, /alter table public\.developer_dataset_exports enable row level security/);
  assert.match(migration, /values \('developer-dataset-exports', 'developer-dataset-exports', false\)/);
});
