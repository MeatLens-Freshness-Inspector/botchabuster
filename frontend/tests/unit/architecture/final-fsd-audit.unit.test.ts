import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  findLegacyRootImportOwners,
  findProductionOwnerViolations,
  findViolations,
} from "../../../scripts/check-fsd-boundaries.mjs";
import { findHardLimitViolations } from "../../../scripts/check-source-size.mjs";

const sourceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../src",
);

test("final frontend tree has no legacy owner, bridge alias, or hard-limit file", async () => {
  const [violations, legacyImports, productionOwners, hardLimitFiles] = await Promise.all([
    findViolations(sourceRoot),
    findLegacyRootImportOwners(sourceRoot),
    findProductionOwnerViolations(sourceRoot),
    findHardLimitViolations(sourceRoot),
  ]);

  assert.deepEqual(violations, []);
  assert.deepEqual(legacyImports, []);
  assert.deepEqual(productionOwners, []);
  assert.deepEqual(hardLimitFiles, []);
});

test("app entrypoint and migrated public slices contain no compatibility alias", async () => {
  const appComposition = await readFile(
    path.join(sourceRoot, "app", "app-composition.tsx"),
    "utf8",
  );
  assert.doesNotMatch(appComposition, /legacy-app-composition|legacy-passkey-storage/);

  await Promise.all([
    "features/inspection-history/index.ts",
    "features/inspection-submission/index.ts",
    "features/tutorials/index.ts",
    "widgets/history/index.ts",
    "widgets/legal/index.ts",
  ].map((relativePath) => access(path.join(sourceRoot, relativePath))));
});
