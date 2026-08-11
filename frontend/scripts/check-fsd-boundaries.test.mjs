import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  findProductionOwnerViolations,
  findViolations,
} from "./check-fsd-boundaries.mjs";

async function createFixture(files) {
  const root = await mkdtemp(path.join(os.tmpdir(), "meatlens-fsd-"));

  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(root, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source, "utf8");
  }

  return {
    root,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

test("finds an import from a lower layer into a higher layer", async () => {
  const fixture = await createFixture({
    "shared/request.ts": 'import { signIn } from "@/features/auth";',
    "features/auth/index.ts": "export function signIn() {}",
  });

  try {
    const violations = await findViolations(fixture.root);

    assert.deepEqual(violations, [
      {
        file: "shared/request.ts",
        importPath: "@/features/auth",
        rule: "upward-layer-import",
      },
    ]);
  } finally {
    await fixture.cleanup();
  }
});

test("allows imports that flow from a higher layer into a lower layer", async () => {
  const fixture = await createFixture({
    "features/auth/index.ts": 'import { User } from "@/entities/user";',
    "entities/user/index.ts": "export type User = { id: string };",
  });

  try {
    assert.deepEqual(await findViolations(fixture.root), []);
  } finally {
    await fixture.cleanup();
  }
});

test("rejects deep imports into another slice on the same layer", async () => {
  const fixture = await createFixture({
    "features/auth/ui/login.ts": 'import { validate } from "@/features/profile/model/validate";',
    "features/profile/model/validate.ts": "export function validate() {}",
  });

  try {
    const violations = await findViolations(fixture.root);

    assert.deepEqual(violations, [
      {
        file: "features/auth/ui/login.ts",
        importPath: "@/features/profile/model/validate",
        rule: "cross-slice-deep-import",
      },
    ]);
  } finally {
    await fixture.cleanup();
  }
});

test("rejects maintained files outside the FSD layers", async () => {
  const fixture = await createFixture({
    "legacy-app-composition.tsx": "export function App() {}",
    "main.tsx": "export {};",
    "test/setup.ts": "export {};",
    "app/App.tsx": "export {};",
  });

  try {
    assert.deepEqual(await findProductionOwnerViolations(fixture.root), [
      {
        file: "legacy-app-composition.tsx",
        rule: "non-fsd-production-owner",
      },
    ]);
  } finally {
    await fixture.cleanup();
  }
});
