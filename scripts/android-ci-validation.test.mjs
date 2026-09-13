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

test("Android CI runs the bounded JVM and instrumentation compile gate", () => {
  assert.match(
    workflow,
    /timeout 110s \.\/gradlew :app:testDebugUnitTest :app:assembleDebugAndroidTest --no-daemon --console=plain/,
  );
  assert.match(workflow, /uses: actions\/upload-artifact@v7/);
  assert.match(workflow, /android\/app\/build\/reports/);
  assert.match(workflow, /if-no-files-found: ignore/);
});

test("Android CI results are included in the blocking quality gate", () => {
  const qualityGate = workflow.slice(workflow.indexOf("  quality-gate:"));

  assert.match(qualityGate, /- android-tests/);
  assert.match(qualityGate, /ANDROID_TESTS: \$\{\{ needs\['android-tests'\]\.result \}\}/);
  assert.match(qualityGate, /Android JVM quality/);
  assert.match(qualityGate, /\"\$ANDROID_TESTS\"/);
});
