import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspaceHookSource = readFileSync(
  new URL("../../../../src/widgets/inspection-workspace/model/use-inspection-workspace.ts", import.meta.url),
  "utf8",
);
const workspaceViewSource = readFileSync(
  new URL("../../../../src/widgets/inspection-workspace/ui/inspection-workspace.tsx", import.meta.url),
  "utf8",
);
const disputeHookSource = readFileSync(
  new URL("../../../../src/features/inspection-disputes/model/use-inspection-dispute.ts", import.meta.url),
  "utf8",
);

test("inspect workspace wires saved inspection disputes", () => {
  assert.match(workspaceHookSource, /savedInspectionId/);
  assert.match(workspaceHookSource, /const createdInspection = await createInspection\.mutateAsync/);
  assert.match(workspaceHookSource, /setSavedInspectionId\(createdInspection\.id\)/);
  assert.ok((workspaceHookSource.match(/resetDispute\(\)/g) ?? []).length >= 2);
  assert.match(disputeHookSource, /setSavedInspectionIdState\(null\)/);
  assert.match(workspaceViewSource, /InspectionDisputeSection/);
  assert.match(workspaceViewSource, /inspectionId=\{inspectPage\.savedInspectionId\}/);
});
