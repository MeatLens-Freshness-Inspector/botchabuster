import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));

function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("scheduled workflows do not ping the production Render service", async () => {
  const workflowDirectory = path.join(root, ".github", "workflows");
  const workflowNames = (await readdir(workflowDirectory)).filter((name) => /\.ya?ml$/i.test(name));
  const workflows = await Promise.all(
    workflowNames.map((name) => read(path.join(".github", "workflows", name))),
  );
  const scheduledWorkflows = workflows.filter((source) => /^\s*schedule\s*:/m.test(source));

  assert.ok(scheduledWorkflows.length > 0, "expected the daily CI schedule to remain covered");
  for (const source of scheduledWorkflows) {
    assert.doesNotMatch(source, /meatlens-backend\.onrender\.com/i);
  }
});

test("Render retains its native lightweight health check", async () => {
  assert.match(await read("render.yaml"), /healthCheckPath:\s*\/api\/analysis\/health/);
});

test("Messages does not use recurring REST polling", async () => {
  const modelDirectory = path.join(root, "frontend", "src", "features", "messaging", "model");
  const sourceNames = (await readdir(modelDirectory)).filter((name) => /\.(?:ts|tsx)$/i.test(name));
  const source = (await Promise.all(
    sourceNames.map((name) => read(path.join("frontend", "src", "features", "messaging", "model", name))),
  )).join("\n");

  assert.doesNotMatch(source, /POLL_INTERVAL|setInterval\s*\(|\b6_000\b/);
});

test("the authenticated message stream bypasses runtime API caches", async () => {
  const viteConfig = await read("frontend/vite.config.ts");
  const streamRoute = viteConfig.indexOf('url.pathname.endsWith("/api/user-chat/events")');
  const networkOnly = viteConfig.indexOf('handler: "NetworkOnly"', streamRoute);
  const apiCache = viteConfig.indexOf('cacheName: "api-cache"');

  assert.ok(streamRoute >= 0, "expected an explicit message-stream service-worker route");
  assert.ok(networkOnly > streamRoute, "expected the message stream to use NetworkOnly");
  assert.ok(networkOnly < apiCache, "expected NetworkOnly to precede the broad API cache");
});

test("the Messages realtime journey is part of the pull-request critical suite", async () => {
  const frontendPackage = JSON.parse(await read("frontend/package.json"));
  assert.match(
    frontendPackage.scripts["test:e2e:critical"],
    /messages-page\.e2e\.spec\.ts/,
  );
});

test("Playwright CI keeps bounded commands and forwards every shard", async () => {
  const workflow = await read(".github/workflows/ci.yml");

  assert.match(workflow, /timeout 110s npm run test:e2e:critical/);
  assert.match(
    workflow,
    /timeout 110s npm run test:e2e:full -- --shard=\$\{\{\s*matrix\.shard\s*\}\}\/4/,
  );
  assert.match(workflow, /shard:\s*\n\s*- 1\n\s*- 2\n\s*- 3\n\s*- 4/);
  assert.match(workflow, /name: Summarize critical Playwright run/);
  assert.match(workflow, /name: Summarize full Playwright run/);
});
