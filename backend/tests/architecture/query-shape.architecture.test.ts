import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const srcRoot = join(process.cwd(), "src");

test("module persistence avoids wildcard and unbounded read projections", () => {
  const persistenceFiles = [
    join(srcRoot, "modules/access-codes/infrastructure/AccessCodeService.ts"),
    join(srcRoot, "modules/chat/infrastructure/UserChatService.ts"),
    join(srcRoot, "modules/inspections/infrastructure/InspectionService.ts"),
    join(srcRoot, "modules/markets/infrastructure/MarketLocationService.ts"),
    join(srcRoot, "modules/users/infrastructure/ProfileService.ts"),
  ];

  for (const file of persistenceFiles) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\.select\(["']\*["']\)/, file);
    assert.doesNotMatch(source, /\.select\(\)/, file);
  }

  const inspectionSource = readFileSync(
    join(srcRoot, "modules/inspections/infrastructure/InspectionService.ts"),
    "utf8",
  );
  assert.match(inspectionSource, /\.range\(0,\s*9_999\)/);
  assert.match(inspectionSource, /\.limit\(10_000\)/);
});
