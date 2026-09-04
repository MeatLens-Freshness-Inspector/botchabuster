import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const DATABASE_SOURCE_URL = new URL(
  "../../../src/shared/platform/sqlite/database.ts",
  import.meta.url,
);

test("SQLite migration 006 uses supported ADD COLUMN syntax", () => {
  const databaseSource = readFileSync(DATABASE_SOURCE_URL, "utf8");
  const migration = databaseSource.match(/const DDL_006 = `([\s\S]*?)`;/)?.[1] ?? "";

  assert.match(
    migration,
    /ALTER TABLE\s+pending_scans\s+ADD COLUMN\s+regulatory_compliance INTEGER;/,
  );
  assert.doesNotMatch(migration, /ADD COLUMN\s+IF NOT EXISTS/);
});
