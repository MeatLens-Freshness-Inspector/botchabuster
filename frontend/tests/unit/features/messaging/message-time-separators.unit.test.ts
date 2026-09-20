import assert from "node:assert/strict";
import test from "node:test";

import { shouldRenderMessageTimeSeparator } from "../../../../src/features/messaging/lib/message-time-separators";

test("renders a separator before the first message", () => {
  assert.equal(shouldRenderMessageTimeSeparator(null, "2026-09-20T10:00:00.000Z"), true);
});

test("does not separate messages 29 minutes apart", () => {
  assert.equal(
    shouldRenderMessageTimeSeparator(
      "2026-09-20T10:00:00.000Z",
      "2026-09-20T10:29:00.000Z",
    ),
    false,
  );
});

test("separates messages exactly 30 minutes apart", () => {
  assert.equal(
    shouldRenderMessageTimeSeparator(
      "2026-09-20T10:00:00.000Z",
      "2026-09-20T10:30:00.000Z",
    ),
    true,
  );
});

test("separates messages 31 minutes apart", () => {
  assert.equal(
    shouldRenderMessageTimeSeparator(
      "2026-09-20T10:00:00.000Z",
      "2026-09-20T10:31:00.000Z",
    ),
    true,
  );
});
