import { test, expect } from "@playwright/test";

import { DEFAULT_DEVELOPER_OPTIONS_FLAGS } from "../../../../src/features/developer-tools";

test("selects the primary model and enables ROI segmentation for new developer option sessions", () => {
  expect(DEFAULT_DEVELOPER_OPTIONS_FLAGS.selectedModel).toBe("primary");
  expect(DEFAULT_DEVELOPER_OPTIONS_FLAGS.disableRoiSegmentation).toBe(false);
});
