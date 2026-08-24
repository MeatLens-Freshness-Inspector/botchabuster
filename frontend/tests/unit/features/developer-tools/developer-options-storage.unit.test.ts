import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_DEVELOPER_OPTIONS_FLAGS,
  getDeveloperOptionsFlags,
  setDeveloperOptionsFlags,
} from "../../../../src/features/developer-tools";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  };
}

const localStorage = createMemoryStorage();
(globalThis as typeof globalThis & { window?: Window }).window = {
  localStorage,
} as Window;

test("new developer flag state selects the primary model and disables ROI segmentation", () => {
  assert.equal(DEFAULT_DEVELOPER_OPTIONS_FLAGS.selectedModel, "primary");
  assert.equal(DEFAULT_DEVELOPER_OPTIONS_FLAGS.disableRoiSegmentation, true);
});

test("stored developer choices survive normalization", () => {
  setDeveloperOptionsFlags("developer-1", {
    ...DEFAULT_DEVELOPER_OPTIONS_FLAGS,
    selectedModel: "resnet50",
    disableRoiSegmentation: true,
  });

  const flags = getDeveloperOptionsFlags("developer-1");
  assert.equal(flags.selectedModel, "resnet50");
  assert.equal(flags.disableRoiSegmentation, true);
});

test("stored developer segmentation override remains enabled when explicitly selected", () => {
  setDeveloperOptionsFlags("developer-override", {
    ...DEFAULT_DEVELOPER_OPTIONS_FLAGS,
    disableRoiSegmentation: false,
  });

  assert.equal(getDeveloperOptionsFlags("developer-override").disableRoiSegmentation, false);
});

test("older default payloads migrate to the primary model", () => {
  localStorage.setItem(
    "meatlens-developer-options-flags:developer-2",
    JSON.stringify({ useSeed123Model2: true, useRoboflowModel3: false, enableModelEnsemble: false }),
  );

  assert.equal(getDeveloperOptionsFlags("developer-2").selectedModel, "primary");
  assert.equal(getDeveloperOptionsFlags("developer-2").disableRoiSegmentation, true);
});

test("older explicit selections migrate to their matching model", () => {
  localStorage.setItem(
    "meatlens-developer-options-flags:developer-3",
    JSON.stringify({ enableModelEnsemble: true }),
  );
  localStorage.setItem(
    "meatlens-developer-options-flags:developer-4",
    JSON.stringify({ useRoboflowModel3: true }),
  );

  assert.equal(getDeveloperOptionsFlags("developer-3").selectedModel, "ensemble");
  assert.equal(getDeveloperOptionsFlags("developer-4").selectedModel, "primary");
});

test("invalid persisted model selections fall back to primary", () => {
  localStorage.setItem(
    "meatlens-developer-options-flags:developer-5",
    JSON.stringify({ selectedModel: "not-a-model" }),
  );

  assert.equal(getDeveloperOptionsFlags("developer-5").selectedModel, "primary");
});
