import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { MobileReportsTab, ReportsTab } from "@/widgets/admin-dashboard";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../");

test("admin dashboard publishes report widget ownership", () => {
  assert.equal(typeof ReportsTab, "function");
  assert.equal(typeof MobileReportsTab, "function");

  const reportsSource = readFileSync(
    resolve(repositoryRoot, "frontend/src/widgets/admin-dashboard/ui/reports-tab.tsx"),
    "utf8",
  );
  const mobileReportsSource = readFileSync(
    resolve(repositoryRoot, "frontend/src/widgets/admin-dashboard/ui/mobile-reports-tab.tsx"),
    "utf8",
  );

  assert.equal(reportsSource.includes("ReportsDisputesSection"), false);
  assert.equal(mobileReportsSource.includes("ReportsDisputesSection"), false);
});
