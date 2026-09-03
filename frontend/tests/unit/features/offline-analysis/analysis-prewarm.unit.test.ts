import assert from "node:assert/strict";
import test from "node:test";

import {
  MOBILE_NET_MODEL_VARIANTS,
  type MobileNetModelVariant,
} from "../../../../src/features/offline-analysis/lib/model-catalog";
import { loadAllAnalysisModels } from "../../../../src/features/offline-analysis/lib/analysis-runtime";

test("eager warmup schedules every MobileNet variant and ResNet50", async () => {
  const mobileCalls: MobileNetModelVariant[] = [];
  let resNetCalls = 0;

  const results = await loadAllAnalysisModels({}, {
    loadMobileNetV3ModelVariant: async (variant) => {
      mobileCalls.push(variant);
      return true;
    },
    loadResNet50Model: async () => {
      resNetCalls += 1;
      return true;
    },
  });

  assert.deepEqual(mobileCalls, MOBILE_NET_MODEL_VARIANTS);
  assert.equal(resNetCalls, 1);
  assert.equal(results.length, MOBILE_NET_MODEL_VARIANTS.length + 1);
  assert.ok(results.every((result) => result.status === "fulfilled" && result.value === true));
});

test("one eager-load failure is isolated from the other model loads", async () => {
  const results = await loadAllAnalysisModels({}, {
    loadMobileNetV3ModelVariant: async (variant) => {
      if (variant === "default") throw new Error("legacy model unavailable");
      return true;
    },
    loadResNet50Model: async () => true,
  });

  assert.equal(results.length, MOBILE_NET_MODEL_VARIANTS.length + 1);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 3);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
});
