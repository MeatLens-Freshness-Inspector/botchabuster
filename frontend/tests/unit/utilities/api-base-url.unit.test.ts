import assert from "node:assert/strict";
import test from "node:test";
import { resolveApiBaseUrl } from "../../../src/integrations/api/apiBaseUrl";

test("resolveApiBaseUrl keeps localhost for web development when env is unset", () => {
  assert.equal(
    resolveApiBaseUrl({
      envApiBaseUrl: "",
      isNativePlatform: false,
    }),
    "http://localhost:3001/api",
  );
});

test("resolveApiBaseUrl falls back to the production API for native builds when env is unset", () => {
  assert.equal(
    resolveApiBaseUrl({
      envApiBaseUrl: "",
      isNativePlatform: true,
    }),
    "https://meatlens-backend.onrender.com/api",
  );
});

test("resolveApiBaseUrl falls back to the production API for native builds when env points at localhost", () => {
  assert.equal(
    resolveApiBaseUrl({
      envApiBaseUrl: "http://localhost:3001/api",
      isNativePlatform: true,
    }),
    "https://meatlens-backend.onrender.com/api",
  );
});

test("resolveApiBaseUrl preserves explicit remote env values for native builds", () => {
  assert.equal(
    resolveApiBaseUrl({
      envApiBaseUrl: "https://custom-backend.example.com/api",
      isNativePlatform: true,
    }),
    "https://custom-backend.example.com/api",
  );
});
