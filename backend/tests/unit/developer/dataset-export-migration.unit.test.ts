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

test("dataset export download token migration supports chunked browser streaming", () => {
  const migration = readFileSync(
    join(process.cwd(), "supabase", "migrations", "20261002100000_add_dataset_export_download_tokens.sql"),
    "utf8",
  );

  assert.match(migration, /add column if not exists download_token_hash text/);
  assert.match(migration, /add column if not exists download_token_expires_at timestamptz/);
  assert.match(migration, /download_token_hash\)/);
});
