import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { strToU8, zipSync } from "fflate";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "service-role-key";
process.env.SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "publishable-key";

test("training-run import rejects ZIP packages without manifest.json", async () => {
  const { developerDashboardService } = await import("../src/services/DeveloperDashboardService");
  const tempDir = await mkdtemp(path.join(tmpdir(), "developer-dashboard-import-"));
  const packagePath = path.join(tempDir, "missing-manifest.zip");

  try {
    await writeFile(packagePath, Buffer.from(zipSync({ "notes.txt": strToU8("missing manifest") })));

    await assert.rejects(
      async () => developerDashboardService.importTrainingRunPackage(packagePath),
      /manifest\.json/i,
    );
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});
