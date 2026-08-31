import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const templatePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/templates/recovery.html",
);
const template = readFileSync(templatePath, "utf8");

test("password recovery email uses the confirmation URL without presenting an unused OTP", () => {
  assert.match(template, /\{\{ \.ConfirmationURL \}\}/);
  assert.doesNotMatch(template, /Recovery Code/);
  assert.doesNotMatch(template, /\{\{ \.Token \}\}/);
});
