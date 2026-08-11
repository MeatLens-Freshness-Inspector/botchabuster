import assert from "node:assert/strict";
import test from "node:test";
import { createHttpApiError, getHttpApiErrorStatus, readApiErrorMessage } from "../../../src/shared/api";

test("shared API errors retain their status for recognized HTTP errors", () => {
  const error = createHttpApiError("Authentication required", 401);

  assert.equal(error.message, "Authentication required");
  assert.equal(getHttpApiErrorStatus(error), 401);
  assert.equal(getHttpApiErrorStatus(new Error("plain error")), null);
});

test("shared API errors prefer payload messages before response fallbacks", async () => {
  const jsonError = new Response(JSON.stringify({ error: "  Invalid session  " }), {
    status: 401,
    statusText: "Unauthorized",
  });
  const textError = new Response("unavailable", {
    status: 503,
    statusText: "Service unavailable",
  });
  const emptyError = new Response("unavailable", { status: 503 });

  assert.equal(await readApiErrorMessage(jsonError, "Request failed"), "Invalid session");
  assert.equal(await readApiErrorMessage(textError, "Request failed"), "Service unavailable");
  assert.equal(await readApiErrorMessage(emptyError, "Request failed"), "Request failed");
});
