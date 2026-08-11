import assert from "node:assert/strict";
import test from "node:test";
import { DesktopInspectionsTab, InspectionsTab } from "@/widgets/admin-dashboard";

test("admin dashboard publishes inspections widget ownership", () => {
  assert.equal(typeof InspectionsTab, "function");
  assert.equal(typeof DesktopInspectionsTab, "function");
});
