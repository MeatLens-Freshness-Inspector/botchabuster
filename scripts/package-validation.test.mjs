import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));

test("root package exposes the Android test command surface", () => {
  assert.deepEqual(
    {
      "test:android:unit": packageJson.scripts["test:android:unit"],
      "test:android:instrumentation": packageJson.scripts["test:android:instrumentation"],
      "test:android:compile": packageJson.scripts["test:android:compile"],
      "test:android": packageJson.scripts["test:android"],
    },
    {
      "test:android:unit": "node scripts/run-android-gradle.mjs :app:testDebugUnitTest",
      "test:android:instrumentation": "node scripts/run-android-gradle.mjs :app:connectedDebugAndroidTest",
      "test:android:compile": "node scripts/run-android-gradle.mjs :app:testDebugUnitTest :app:assembleDebugAndroidTest",
      "test:android": "npm run test:android:compile",
    },
  );
});

test("Android test commands use the repository Gradle launcher", () => {
  assert.equal(fs.existsSync(path.join(repoRoot, "scripts", "run-android-gradle.mjs")), true);
});
