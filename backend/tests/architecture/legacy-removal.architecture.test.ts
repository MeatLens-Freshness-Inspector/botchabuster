import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const backendRoot = process.cwd();
const legacyDirectories = ["src/routes", "src/controllers", "src/services"];

function listTypeScriptFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptFiles(filePath);
    return entry.name.endsWith(".ts") ? [filePath] : [];
  });
}

test("legacy backend source directories are removed", () => {
  const present = legacyDirectories.filter((relativePath) => existsSync(join(backendRoot, relativePath)));
  assert.deepEqual(present, [], `Legacy backend directories remain: ${present.join(", ")}`);
});

test("backend source and tests do not import legacy paths", () => {
  const files = [
    ...listTypeScriptFiles(join(backendRoot, "src")),
    ...listTypeScriptFiles(join(backendRoot, "tests")),
  ];
  const violations = files.flatMap((filePath) => {
    const source = readFileSync(filePath, "utf8");
    return /src[\\/](?:routes|controllers|services)[\\/]|(?:from|import)\s+["'](?:\.\.[\\/]){2,}(?:routes|controllers|services)[\\/]/.test(source)
      ? [filePath]
      : [];
  });

  assert.deepEqual(violations, [], `Legacy imports remain in: ${violations.join(", ")}`);
});
