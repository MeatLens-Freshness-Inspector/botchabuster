import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { findSourceSizeViolations } from "./check-source-size.mjs";

async function createFixture(files) {
  const root = await mkdtemp(path.join(os.tmpdir(), "meatlens-size-"));

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

test("reports a maintained source file above the hard limit", async () => {
  const fixture = await createFixture({
    "features/auth/provider.ts": "const line = true;\n".repeat(5),
  });

  try {
    const violations = await findSourceSizeViolations(fixture.root, {
      splitTrigger: 3,
      hardLimit: 4,
    });

    assert.deepEqual(violations, [
      {
        file: "features/auth/provider.ts",
        nonBlankLines: 5,
        rule: "hard-limit",
      },
    ]);
  } finally {
    await fixture.cleanup();
  }
});

test("reports a source file at the split trigger without treating it as over the hard limit", async () => {
  const fixture = await createFixture({
    "entities/user/types.ts": "type User = {\n  id: string;\n};\n",
  });

  try {
    const violations = await findSourceSizeViolations(fixture.root, {
      splitTrigger: 3,
      hardLimit: 4,
    });

    assert.deepEqual(violations, [
      {
        file: "entities/user/types.ts",
        nonBlankLines: 3,
        rule: "split-trigger",
      },
    ]);
  } finally {
    await fixture.cleanup();
  }
});

test("counts non-blank maintained source lines and ignores unsupported files", async () => {
  const fixture = await createFixture({
    "shared/request.ts": "const first = true;\n\nconst second = true;\n",
    "shared/notes.md": "line one\nline two\nline three\nline four\n",
  });

  try {
    assert.deepEqual(
      await findSourceSizeViolations(fixture.root, {
        splitTrigger: 2,
        hardLimit: 3,
      }),
      [
        {
          file: "shared/request.ts",
          nonBlankLines: 2,
          rule: "split-trigger",
        },
      ],
    );
  } finally {
    await fixture.cleanup();
  }
});
