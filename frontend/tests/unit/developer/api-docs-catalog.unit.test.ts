import assert from "node:assert/strict";
import test from "node:test";
import {
  API_DOCS_CATEGORIES,
  API_DOCS_OPERATIONS,
} from "../../../src/features/developer-tools";

test("catalog contains every API route operation exactly once", () => {
  assert.equal(API_DOCS_OPERATIONS.length, 58);
  assert.equal(new Set(API_DOCS_OPERATIONS.map((operation) => operation.id)).size, 58);
  assert.deepEqual(
    API_DOCS_CATEGORIES.map((category) => category.id),
    [
      "auth",
      "analysis",
      "access-codes",
      "inspections",
      "profiles",
      "stats",
      "upload",
      "chat",
      "market-locations",
      "audit-logs",
      "developer-options",
      "developer-dashboard",
      "user-chat",
    ],
  );

  for (const operation of API_DOCS_OPERATIONS) {
    assert.ok(operation.categoryId);
    assert.ok(operation.path.startsWith("/"));
    assert.ok(["GET", "POST", "PUT", "PATCH", "DELETE"].includes(operation.method));
  }
});

test("catalog marks credential fields and no-content auth responses", () => {
  const signIn = API_DOCS_OPERATIONS.find((operation) => operation.id === "auth-sign-in");
  const recovery = API_DOCS_OPERATIONS.find((operation) => operation.id === "auth-recovery-password");
  const reset = API_DOCS_OPERATIONS.find((operation) => operation.id === "auth-reset-password");
  const updatePassword = API_DOCS_OPERATIONS.find((operation) => operation.id === "auth-update-password");

  assert.deepEqual(signIn?.body.mode === "json" ? signIn.body.sensitiveFields : [], ["password"]);
  assert.deepEqual(recovery?.body.mode === "json" ? recovery.body.sensitiveFields : [], ["accessToken", "password"]);
  assert.equal(reset?.responseKind, "empty");
  assert.equal(updatePassword?.responseKind, "empty");
  assert.equal(
    updatePassword?.body.mode === "json" ? updatePassword.body.defaultValue : null,
    '{"currentPassword":"","newPassword":""}',
  );
  assert.deepEqual(
    updatePassword?.body.mode === "json" ? updatePassword.body.sensitiveFields : [],
    ["currentPassword", "newPassword"],
  );
});
