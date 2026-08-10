import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const applicationRoot = join(process.cwd(), "src", "modules");

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptFiles(filePath);
    return entry.name.endsWith(".ts") ? [filePath] : [];
  });
}

test("application classes expose one public execute operation", () => {
  const violations: string[] = [];
  for (const filePath of listTypeScriptFiles(applicationRoot)) {
    if (!filePath.includes(`${join("modules", "")}`)) continue;
    const relativePath = filePath.replace(applicationRoot, "").replaceAll("\\", "/");
    if (!relativePath.includes("/application/")) continue;

    const source = readFileSync(filePath, "utf8");
    const classes = [...source.matchAll(/export class\s+([A-Za-z0-9_]+)/g)];
    for (const classMatch of classes) {
      const classStart = classMatch.index ?? 0;
      const classBody = source.slice(classStart);
      const publicMethods = [...classBody.matchAll(/\n\s+(?:(?:public|private|protected|static|async)\s+)*([A-Za-z0-9_]+)\s*\(/g)]
        .map((match) => match[1])
        .filter((name) => !["constructor", "if", "for", "while", "switch", "catch"].includes(name) && !name.startsWith("_"));
      if (publicMethods.length !== 1 || publicMethods[0] !== "execute") {
        violations.push(`${relativePath}:${classMatch[1]} exposes ${publicMethods.join(", ") || "no operation"}`);
      }
    }
  }

  assert.deepEqual(violations, [], violations.join("\n"));
});
