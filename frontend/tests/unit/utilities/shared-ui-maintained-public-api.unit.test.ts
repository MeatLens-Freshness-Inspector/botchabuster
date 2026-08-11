import assert from "node:assert/strict";
import test from "node:test";

import { AlertDialog } from "../../../src/shared/ui/alert-dialog";
import { SmartPagination } from "../../../src/shared/ui/SmartPagination";
import { Toaster as SonnerToaster } from "../../../src/shared/ui/sonner";
import { Toaster } from "../../../src/shared/ui/toaster";

test("shared UI public modules expose maintained notification and navigation primitives", () => {
  assert.equal(typeof AlertDialog, "function");
  assert.equal(typeof SmartPagination, "function");
  assert.equal(typeof SonnerToaster, "function");
  assert.equal(typeof Toaster, "function");
});
