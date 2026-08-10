import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

const sourceRoot = join(process.cwd(), "src", "modules");

function listTypeScriptFiles(directory: string): string[] {
  const entries = require("node:fs").readdirSync(directory, { withFileTypes: true }) as Array<{
    name: string;
    isDirectory(): boolean;
  }>;

  return entries.flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptFiles(path);
    return entry.name.endsWith(".ts") ? [path] : [];
  });
}

test("module presentation and application layers do not import Supabase directly", () => {
  assert.ok(require("node:fs").existsSync(sourceRoot), "src/modules must exist before boundary checks run");

  const violations = listTypeScriptFiles(sourceRoot).flatMap((file) => {
    const moduleRelativePath = relative(sourceRoot, file).replaceAll("\\", "/");
    if (!/(^|\/)(presentation|application)\//.test(moduleRelativePath)) return [];

    const contents = readFileSync(file, "utf8");
    return contents.includes("@supabase/supabase-js") ? [moduleRelativePath] : [];
  });

  assert.deepEqual(violations, [], `Supabase imports found in module boundary files: ${violations.join(", ")}`);
});
