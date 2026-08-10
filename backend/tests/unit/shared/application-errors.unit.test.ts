import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ApplicationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../../../src/shared/domain/errors/ApplicationError";

test("typed application errors expose stable status codes", () => {
  const errors: Array<[ApplicationError, number]> = [
    [new ValidationError("invalid field"), 400],
    [new AuthorizationError(), 403],
    [new NotFoundError("inspection"), 404],
  ];

  for (const [error, statusCode] of errors) {
    assert.equal(error.statusCode, statusCode);
    assert.ok(error instanceof ApplicationError);
    assert.equal(error.isOperational, true);
  }
});

test("NotFoundError does not expose an internal record identifier by default", () => {
  const error = new NotFoundError("inspection");

  assert.equal(error.message, "inspection not found");
  assert.equal(error.message.includes("id"), false);
});
