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

test("new developer flag state disables Roboflow and gray ROI preprocessing by default", () => {
  assert.equal(DEFAULT_DEVELOPER_OPTIONS_FLAGS.useRoboflowModel3, false);
  assert.equal(DEFAULT_DEVELOPER_OPTIONS_FLAGS.disableRoiSegmentation, false);
});

test("stored developer choices survive normalization", () => {
  setDeveloperOptionsFlags("developer-1", {
    ...DEFAULT_DEVELOPER_OPTIONS_FLAGS,
    useRoboflowModel3: true,
    disableRoiSegmentation: true,
  });

  const flags = getDeveloperOptionsFlags("developer-1");
  assert.equal(flags.useRoboflowModel3, true);
  assert.equal(flags.disableRoiSegmentation, true);
});

test("older stored payloads receive the new false default", () => {
  localStorage.setItem(
    "meatlens-developer-options-flags:developer-2",
    JSON.stringify({ useSeed123Model2: true }),
  );

  assert.equal(getDeveloperOptionsFlags("developer-2").disableRoiSegmentation, false);
});
