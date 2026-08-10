import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const backendRoot = process.cwd();

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => join(directory, entry.name));
}

test("legacy routes and controllers contain compatibility exports only", () => {
  const files = [
    ...sourceFiles(join(backendRoot, "src/routes")),
    ...sourceFiles(join(backendRoot, "src/controllers")),
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\bnew\s+Router\s*\(/, file);
    assert.doesNotMatch(source, /\bexport\s+class\s+\w+Controller\b/, file);
    assert.doesNotMatch(source, /router\.(get|post|put|patch|delete)\s*\(/, file);
  }
});
