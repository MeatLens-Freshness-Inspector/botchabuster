import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const legacyRoots = ["controllers", "routes", "services"];

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptFiles(filePath);
    return entry.name.endsWith(".ts") ? [filePath] : [];
  });
}

test("legacy backend layers contain no direct Supabase or SQL access", () => {
  const violations = legacyRoots.flatMap((root) => {
    const directory = join(process.cwd(), "src", root);
    return listTypeScriptFiles(directory).flatMap((filePath) => {
      const source = readFileSync(filePath, "utf8");
      return /@supabase\/supabase-js|integrations\/supabase|\.from\(\s*["']|\.rpc\(\s*["']/.test(source)
        ? [filePath]
        : [];
    });
  });

  assert.deepEqual(violations, [], `Legacy persistence access remains in: ${violations.join(", ")}`);
});
