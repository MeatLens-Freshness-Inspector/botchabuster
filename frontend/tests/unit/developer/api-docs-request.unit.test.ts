import assert from "node:assert/strict";
import test from "node:test";
import {
  buildApiDocsRequest,
  createDefaultApiDocsEditorValues,
  validateApiDocsEditor,
} from "../../../src/pages/admin-dashboard/components/developer/api-docs/request";
import type { ApiDocsOperation } from "../../../src/pages/admin-dashboard/components/developer/api-docs/types";

const operationWithPathAndQuery: ApiDocsOperation = {
  id: "inspection-get",
  categoryId: "inspections",
  method: "GET",
  path: "/inspections/{id}",
  summary: "Read inspection",
  description: "Read inspection",
  permission: "Authenticated",
  parameters: [
    { name: "id", location: "path", required: true, description: "Inspection id" },
    { name: "scope", location: "query", required: false, description: "Scope", defaultValue: "mine" },
    { name: "empty", location: "query", required: false, description: "Empty value" },
  ],
  body: { mode: "none", contentType: null },
  responseKind: "json",
  responseContentType: "application/json",
};

const jsonOperation: ApiDocsOperation = {
  ...operationWithPathAndQuery,
  id: "inspection-create",
  method: "POST",
  path: "/inspections",
  parameters: [],
  body: { mode: "json", contentType: "application/json", defaultValue: "{}" },
};

const urlencodedOperation: ApiDocsOperation = {
  ...jsonOperation,
  id: "auth-recovery",
  path: "/auth/recovery/password",
  body: {
    mode: "urlencoded",
    contentType: "application/x-www-form-urlencoded",
    fields: [{ name: "token", label: "Token", description: "Recovery token", required: true, kind: "text" }],
  },
};

const formOperation: ApiDocsOperation = {
  ...jsonOperation,
  id: "upload-image",
  path: "/upload/inspection-image",
  body: {
    mode: "form-data",
    contentType: "multipart/form-data",
    fields: [{ name: "image", label: "Image", description: "Image file", required: true, kind: "file", accept: "image/*" }],
  },
};

test("builds encoded path and query values while omitting empty optional values", () => {
  const request = buildApiDocsRequest(operationWithPathAndQuery, {
    path: { id: "a/b" },
    query: { scope: "all", empty: "" },
    headers: {},
    body: "",
    files: {},
  });

  assert.equal(request.url, "http://localhost:3001/api/inspections/a%2Fb?scope=all");
});

test("rejects malformed JSON before execution", () => {
  assert.equal(
    validateApiDocsEditor(jsonOperation, {
      path: {},
      query: {},
      headers: {},
      body: "{bad",
      files: {},
    }),
    "Request body must be valid JSON",
  );
});

test("creates URL-encoded bodies with their declared content type", () => {
  const request = buildApiDocsRequest(urlencodedOperation, {
    path: {},
    query: {},
    headers: {},
    body: { token: "recovery token" },
    files: {},
  });

  assert.equal(new Headers(request.init.headers).get("Content-Type"), "application/x-www-form-urlencoded");
  assert.equal(request.init.body, "token=recovery+token");
});

test("creates multipart bodies without manually setting a boundary", () => {
  const image = new File(["image"], "inspection.jpg", { type: "image/jpeg" });
  const request = buildApiDocsRequest(formOperation, {
    path: {},
    query: {},
    headers: {},
    body: {},
    files: { image },
  });

  assert.ok(request.init.body instanceof FormData);
  assert.equal(new Headers(request.init.headers).get("Content-Type"), null);
  assert.equal((request.init.body as FormData).get("image"), image);
});

test("default editor values come from the catalog body and parameters", () => {
  const values = createDefaultApiDocsEditorValues(operationWithPathAndQuery);
  assert.deepEqual(values.path, { id: "" });
  assert.deepEqual(values.query, { scope: "mine", empty: "" });
  assert.equal(values.body, "");
});
