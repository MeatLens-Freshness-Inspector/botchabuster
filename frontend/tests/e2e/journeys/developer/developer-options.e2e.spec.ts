import { test, expect } from "@playwright/test";

import { DEFAULT_DEVELOPER_OPTIONS_FLAGS } from "../../../../src/features/developer-tools";

test("disables model ensemble by default for new developer option sessions", () => {
  expect(DEFAULT_DEVELOPER_OPTIONS_FLAGS.enableModelEnsemble).toBe(false);
  expect(DEFAULT_DEVELOPER_OPTIONS_FLAGS.useSeed123Model2).toBe(true);
  expect(DEFAULT_DEVELOPER_OPTIONS_FLAGS.useRoboflowModel3).toBe(false);
  expect(DEFAULT_DEVELOPER_OPTIONS_FLAGS.disableRoiSegmentation).toBe(false);
});
