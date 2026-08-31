import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailSheetSource = readFileSync(
  new URL("../../../../src/widgets/inspection-history/ui/inspection-detail-sheet.tsx", import.meta.url),
  "utf8",
);

test("inspection detail sheet owns the shared future meat scope label", () => {
  assert.match(detailSheetSource, /getMeatTypeScopeLabel/);
  assert.match(detailSheetSource, /text-warning/);
});
