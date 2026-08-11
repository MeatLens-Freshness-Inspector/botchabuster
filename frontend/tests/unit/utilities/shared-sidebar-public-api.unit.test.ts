import assert from "node:assert/strict";
import test from "node:test";

import { Sidebar, SidebarMenuButton, SidebarProvider, useSidebar } from "../../../src/shared/ui/sidebar";

test("shared sidebar public API exposes provider and layout primitives", () => {
  assert.equal(typeof SidebarProvider, "object");
  assert.equal(typeof Sidebar, "object");
  assert.equal(typeof SidebarMenuButton, "object");
  assert.equal(typeof useSidebar, "function");
});
