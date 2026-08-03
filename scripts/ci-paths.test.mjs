import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import { classifyChangedPaths } from "./ci-paths.mjs";

test("classifies frontend-only changes without backend impact", () => {
  const result = classifyChangedPaths(["frontend/src/App.tsx"]);

  assert.deepEqual(result, {
    frontend: true,
    backend: false,
    shared: false,
    docsOnly: false,
    workflow: false,
    anyRelevantChanges: true,
  });
});

test("treats documentation-only changes as docs-only and not test-relevant", () => {
  const result = classifyChangedPaths(["docs/superpowers/specs/2026-08-03-ci-cd-design.md"]);

  assert.deepEqual(result, {
    frontend: false,
    backend: false,
    shared: false,
    docsOnly: true,
    workflow: false,
    anyRelevantChanges: false,
  });
});

test("treats shared root files as impacting both application surfaces", () => {
  const result = classifyChangedPaths(["package-lock.json"]);

  assert.deepEqual(result, {
    frontend: true,
    backend: true,
    shared: true,
    docsOnly: false,
    workflow: false,
    anyRelevantChanges: true,
  });
});

test("treats workflow changes as shared non-doc changes", () => {
  const result = classifyChangedPaths([".github/workflows/test-architecture.yml"]);

  assert.deepEqual(result, {
    frontend: true,
    backend: true,
    shared: true,
    docsOnly: false,
    workflow: true,
    anyRelevantChanges: true,
  });
});

test("prints workflow-ready CLI output", () => {
  const result = spawnSync("node", ["scripts/ci-paths.mjs", "frontend/src/App.tsx"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /frontend=true/);
  assert.match(result.stdout, /backend=false/);
});
