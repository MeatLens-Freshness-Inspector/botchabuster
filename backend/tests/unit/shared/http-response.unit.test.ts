import assert from "node:assert/strict";
import { test } from "node:test";
import { ValidationError } from "../../../src/shared/domain/errors/ApplicationError";
import { toHttpErrorResponse } from "../../../src/shared/presentation/http/response";

test("toHttpErrorResponse serializes operational application errors", () => {
  assert.deepEqual(toHttpErrorResponse(new ValidationError("email is invalid")), {
    status: 400,
    body: { error: "email is invalid" },
  });
});

test("toHttpErrorResponse hides unexpected internal error details", () => {
  assert.deepEqual(toHttpErrorResponse(new Error("database password leaked")), {
    status: 500,
    body: { error: "Internal server error" },
  });
  assert.deepEqual(toHttpErrorResponse("unknown"), {
    status: 500,
    body: { error: "Internal server error" },
  });
});
