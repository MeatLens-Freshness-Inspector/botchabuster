import assert from "node:assert/strict";
import { test } from "node:test";
import { getDefaultPasskeyDeviceLabel } from "../../../../src/features/passkeys";

test("passkey browser adapter provides a stable server-safe device label", () => {
  assert.match(getDefaultPasskeyDeviceLabel(), /device$/);
});
