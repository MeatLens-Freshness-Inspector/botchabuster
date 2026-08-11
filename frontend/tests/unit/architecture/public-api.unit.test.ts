import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { findLegacyRootImportOwners } from "../../../scripts/check-fsd-boundaries.mjs";
import { queryClient, shouldRetryQuery } from "../../../src/app/config/query-client";
import { AuthProvider, useAuth } from "../../../src/app/providers";
import { createHttpApiError, fetchWithTimeout } from "../../../src/shared/api";
import { Button, Input, Label } from "../../../src/shared/ui";

const sourceRoot = fileURLToPath(new URL("../../../src", import.meta.url));

test("foundation public modules expose app and shared contracts", () => {
  assert.equal(typeof queryClient, "object");
  assert.equal(shouldRetryQuery(0, true), true);
  assert.equal(typeof createHttpApiError, "function");
  assert.equal(typeof fetchWithTimeout, "function");
  assert.ok(Button);
  assert.ok(Input);
  assert.ok(Label);
  assert.ok(AuthProvider);
  assert.equal(typeof useAuth, "function");
});

test("foundation boundary audit reports remaining legacy-root import owners", async () => {
  const owners = await findLegacyRootImportOwners(sourceRoot);

  assert.equal(owners.some((owner) => owner.owner === "contexts"), false);
});
