import { test, expect } from "@playwright/test";

import { DEFAULT_DEVELOPER_OPTIONS_FLAGS } from "../src/lib/developerOptions";

test("enables model ensemble by default for new developer option sessions", () => {
  expect(DEFAULT_DEVELOPER_OPTIONS_FLAGS.enableModelEnsemble).toBe(true);
});
