import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("developer dataset export exposes start, progress, and download routes", () => {
  const routes = readFileSync(
    join(process.cwd(), "src", "modules", "developer", "presentation", "dashboard-routes.ts"),
    "utf8",
  );
  const controller = readFileSync(
    join(process.cwd(), "src", "modules", "developer", "presentation", "controllers", "DeveloperDashboardController.ts"),
    "utf8",
  );
  const documentation = readFileSync(
    join(process.cwd(), "..", "documentation", "API_REFERENCE.md"),
    "utf8",
  );

  assert.match(routes, /post\("\/datasets\/export\/start"/);
  assert.match(routes, /get\("\/datasets\/export\/:exportId\/progress"/);
  assert.match(routes, /get\("\/datasets\/export\/:exportId\/download"/);
  assert.match(controller, /startDatasetExport/);
  assert.match(controller, /getDatasetExportProgress/);
  assert.match(controller, /getDatasetExportBuffer/);
  assert.match(documentation, /POST \/api\/developer-dashboard\/datasets\/export\/start/);
  assert.match(documentation, /GET \/api\/developer-dashboard\/datasets\/export\/:exportId\/progress/);
  assert.match(documentation, /GET \/api\/developer-dashboard\/datasets\/export\/:exportId\/download/);
});
