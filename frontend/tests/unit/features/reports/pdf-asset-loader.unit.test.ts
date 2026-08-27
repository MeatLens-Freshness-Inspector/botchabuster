import assert from "node:assert/strict";
import test from "node:test";

import { createReportInspectionImageLoader } from "../../../../src/features/reports/lib/pdf/assets";

test("report inspection image loader caches duplicate paths and bounds concurrency", async () => {
  let active = 0;
  let maxActive = 0;
  let calls = 0;

  const loadAsset = async (path: string): Promise<string | null> => {
    calls += 1;
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return `data:image/png;base64,${path}`;
  };
  const load = createReportInspectionImageLoader(loadAsset, 2);

  const results = await Promise.all([
    load("same"),
    load("same"),
    load("second"),
    load("third"),
  ]);

  assert.equal(calls, 3);
  assert.equal(maxActive, 2);
  assert.deepEqual(results, [
    "data:image/png;base64,same",
    "data:image/png;base64,same",
    "data:image/png;base64,second",
    "data:image/png;base64,third",
  ]);
  assert.equal(await load(null), null);
});

test("report inspection image loader propagates image-load failures", async () => {
  const load = createReportInspectionImageLoader(async () => {
    throw new Error("broken image error");
  });

  await assert.rejects(load("broken"), /broken image error/);
});
