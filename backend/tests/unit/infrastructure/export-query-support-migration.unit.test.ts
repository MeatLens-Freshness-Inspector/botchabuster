import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260826120000_export_query_support.sql",
);

test("export query migration adds stable filter/order indexes", () => {
  const sql = readFileSync(migrationPath, "utf8").toLowerCase();

  assert.match(sql, /inspections_manual_classification_created_id_idx/);
  assert.match(sql, /on public\.inspections \(manual_classification, created_at desc, id desc\)/);
  assert.match(sql, /inspections_meat_type_created_id_idx/);
  assert.match(sql, /on public\.inspections \(meat_type, created_at desc, id desc\)/);
  assert.match(sql, /inspections_image_created_id_idx/);
  assert.match(sql, /where image_url is not null/);
});
