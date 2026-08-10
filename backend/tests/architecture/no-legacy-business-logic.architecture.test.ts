import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const moduleRoot = join(process.cwd(), "src", "modules");

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptFiles(filePath);
    return entry.name.endsWith(".ts") ? [filePath] : [];
  });
}

test("module presentation and application layers contain no persistence logic", () => {
  const violations = listTypeScriptFiles(moduleRoot).flatMap((filePath) => {
    const relativePath = filePath.replace(moduleRoot, "").replaceAll("\\", "/");
    if (!/(^|\/)(presentation|application)\//.test(relativePath)) return [];

    const source = readFileSync(filePath, "utf8");
    return /@supabase\/supabase-js|integrations\/supabase|\.from\(\s*["']|\.rpc\(\s*["']/.test(source)
      ? [filePath]
      : [];
  });

  assert.deepEqual(violations, [], `Persistence access remains in module boundary files: ${violations.join(", ")}`);
});
