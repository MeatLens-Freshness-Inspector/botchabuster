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
