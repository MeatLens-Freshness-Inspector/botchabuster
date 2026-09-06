import assert from "node:assert/strict";
import test from "node:test";
import { createCorsOptions } from "../../../src/config/cors";

test("CORS permits the encrypted transport key without changing credentials", () => {
  const options = createCorsOptions(["https://app.example"]);

  assert.deepEqual(options.allowedHeaders, [
    "Authorization",
    "Content-Type",
    "X-CSRF-Token",
    "X-Transport-Key",
  ]);
  assert.equal(options.credentials, true);
});
