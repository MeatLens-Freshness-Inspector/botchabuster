import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260810100000_bounded_chat_contacts.sql",
);

test("chat contacts migration defines a bounded role-aware aggregate RPC", () => {
  const sql = readFileSync(migrationPath, "utf8").toLowerCase();

  assert.match(sql, /create or replace function public\.get_user_chat_contacts/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path\s*=\s*public/);
  assert.match(sql, /left join lateral/);
  assert.match(sql, /distinct on|limit\s+1/);
  assert.match(sql, /revoke all on function public\.get_user_chat_contacts/);
  assert.match(sql, /grant execute on function public\.get_user_chat_contacts/);
});
