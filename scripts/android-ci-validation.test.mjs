import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, "..");
const workflow = fs.readFileSync(path.join(repoRoot, ".github", "workflows", "ci.yml"), "utf8");

test("Android CI uses Java 17 and Gradle dependency caching", () => {
  assert.match(workflow, /android-tests:/);
  assert.match(workflow, /uses: actions\/setup-java@v7[\s\S]*distribution: temurin[\s\S]*java-version: ['"]?17['"]?/);
  assert.match(workflow, /uses: gradle\/actions\/setup-gradle@v4/);
  assert.match(workflow, /working-directory: android/);
});
