import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("developer dashboard exposes an admin-protected dispute history route", () => {
  const routes = readFileSync(
    join(process.cwd(), "src", "modules", "developer", "presentation", "dashboard-routes.ts"),
    "utf8",
  );

  assert.match(routes, /get\("\/disputes\/history", requireAdmin, \(req, res\) => void disputeController\.listAllForReview\(req, res\)\)/);
});
