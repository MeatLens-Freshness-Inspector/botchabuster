import assert from "node:assert/strict";
import test from "node:test";
import {
  API_DOCS_CATEGORIES,
  API_DOCS_OPERATIONS,
} from "../../../src/features/developer-tools";

test("catalog contains every API route operation exactly once", () => {
  assert.equal(API_DOCS_OPERATIONS.length, 61);
  assert.equal(new Set(API_DOCS_OPERATIONS.map((operation) => operation.id)).size, 61);
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
      "model-accuracy",
      "user-chat",
    ],
  );

  for (const operation of API_DOCS_OPERATIONS) {
    assert.ok(operation.categoryId);
    assert.ok(operation.path.startsWith("/"));
    assert.ok(["GET", "POST", "PUT", "PATCH", "DELETE"].includes(operation.method));
  }
});

test("catalog documents model calibration analytics and package import", () => {
  assert.deepEqual(
    API_DOCS_OPERATIONS.filter((operation) => operation.categoryId === "model-accuracy").map((operation) => ({
      id: operation.id,
      method: operation.method,
      path: operation.path,
      permission: operation.permission,
    })),
    [
      {
        id: "model-accuracy-calibration",
        method: "GET",
        path: "/model-accuracy/calibration",
        permission: "Admin or developer",
      },
      {
        id: "model-accuracy-calibration-import",
        method: "POST",
        path: "/model-accuracy/calibration/import",
        permission: "Admin or developer",
      },
    ],
  );

  const calibration = API_DOCS_OPERATIONS.find((operation) => operation.id === "model-accuracy-calibration");
  assert.deepEqual(
    calibration?.parameters.map((parameter) => parameter.name),
    ["modelVersionKey", "className"],
  );

  const calibrationImport = API_DOCS_OPERATIONS.find(
    (operation) => operation.id === "model-accuracy-calibration-import",
  );
  assert.equal(calibrationImport?.body.mode, "form-data");
  assert.deepEqual(
    calibrationImport?.body.mode === "form-data" ? calibrationImport.body.fields.map((field) => field.name) : [],
    ["package"],
  );
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
