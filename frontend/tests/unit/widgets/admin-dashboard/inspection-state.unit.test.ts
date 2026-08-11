import assert from "node:assert/strict";
import test from "node:test";

import {
  useInspectionPagination,
  useInspectionsTab,
} from "../../../../src/widgets/admin-dashboard";

test("admin dashboard publishes inspection state hooks", () => {
  assert.equal(typeof useInspectionPagination, "function");
  assert.equal(typeof useInspectionsTab, "function");
});
