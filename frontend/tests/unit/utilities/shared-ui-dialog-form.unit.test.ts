import assert from "node:assert/strict";
import test from "node:test";

import { Dialog, DialogContent } from "../../../src/shared/ui/dialog";
import { Form, FormField, FormLabel } from "../../../src/shared/ui/form";
import { Label } from "../../../src/shared/ui/label";

test("shared UI public API exposes dialog and form primitives", () => {
  assert.equal(typeof Dialog, "function");
  assert.equal(typeof DialogContent, "object");
  assert.equal(typeof Form, "function");
  assert.equal(typeof FormField, "function");
  assert.equal(typeof FormLabel, "object");
  assert.equal(typeof Label, "object");
});
