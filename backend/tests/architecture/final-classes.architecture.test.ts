import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sourceRoot = join(process.cwd(), "src", "modules");

function listTypeScriptFiles(directory: string): string[] {
  const fs = require("node:fs") as typeof import("node:fs");
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptFiles(path);
    return entry.name.endsWith(".ts") ? [path] : [];
  });
}

test("@final classes expose a private constructor", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  assert.ok(fs.existsSync(sourceRoot), "src/modules must exist before final-class checks run");

  const violations: string[] = [];
  for (const file of listTypeScriptFiles(sourceRoot)) {
    const contents = readFileSync(file, "utf8");
    if (!contents.includes("@final")) continue;
    const classMatches = contents.matchAll(/@final[\s\S]{0,160}?class\s+([A-Za-z0-9_]+)/g);
    for (const match of classMatches) {
      const classStart = match.index ?? 0;
      const classBody = contents.slice(classStart, classStart + 600);
      if (!/private\s+constructor\s*\(/.test(classBody)) {
        violations.push(`${file}:${match[1]}`);
      }
    }
  }

  assert.deepEqual(violations, [], `Final classes without private constructors: ${violations.join(", ")}`);
});
