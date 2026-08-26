import assert from "node:assert/strict";
import { test } from "node:test";
import { createModelAccuracyRouter } from "../../../src/modules/model-accuracy/presentation/routes";

test("model accuracy router exposes authenticated history and developer writes", () => {
  const router = createModelAccuracyRouter({
    register: async () => { throw new Error("not used"); },
    history: async () => [],
    capture: async () => [],
  });
  const layers = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack
    .filter((entry) => entry.route)
    .map((entry) => ({ path: entry.route?.path, methods: entry.route?.methods }));

  assert.deepEqual(layers.map((layer) => `${layer.methods?.get ? "GET" : "POST"} ${layer.path}`), [
    "GET /history",
    "POST /versions",
    "POST /snapshots",
  ]);
});
