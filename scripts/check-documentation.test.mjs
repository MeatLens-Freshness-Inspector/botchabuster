import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { checkDocumentation } from "./check-documentation.mjs";

test("repository documentation has all required guides and valid local links", () => {
  const errors = checkDocumentation(process.cwd());
  assert.deepEqual(errors, []);
});

test("documentation validation reports a missing local markdown target", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "meatlens-docs-"));
  const documentationRoot = path.join(root, "documentation");
  fs.mkdirSync(documentationRoot, { recursive: true });

  for (const fileName of [
    "README.md",
    "ARCHITECTURE.md",
    "API_REFERENCE.md",
    "SECURITY.md",
    "GETTING_STARTED.md",
    "DEPLOYMENT.md",
    "PROJECT_OVERVIEW.md",
  ]) {
    fs.writeFileSync(path.join(documentationRoot, fileName), "# guide\n", "utf8");
  }

  fs.writeFileSync(
    path.join(documentationRoot, "README.md"),
    "[missing](MISSING.md)\n",
    "utf8",
  );

  const errors = checkDocumentation(root);
  assert.ok(errors.some((error) => error.includes("MISSING.md")));
});
