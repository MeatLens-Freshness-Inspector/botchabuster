import { test, expect } from "@playwright/test";
import corsModule from "../../backend/dist/config/cors.js";

const {
  createCorsOptions,
  getAllowedOrigins,
  isOriginAllowed,
  parseAllowedOrigins,
} = corsModule as {
  createCorsOptions: (allowedOrigins: readonly string[]) => { origin?: unknown; credentials?: boolean; allowedHeaders?: string[] };
  getAllowedOrigins: (env: NodeJS.ProcessEnv) => string[];
  isOriginAllowed: (origin: string | undefined, allowedOrigins: readonly string[]) => boolean;
  parseAllowedOrigins: (value: string | undefined) => string[];
};

test("parseAllowedOrigins trims whitespace and removes empty entries", () => {
  expect(parseAllowedOrigins(" https://app.example.com , , https://admin.example.com ")).toEqual([
    "https://app.example.com",
    "https://admin.example.com",
  ]);
});

test("isOriginAllowed matches both exact origins and wildcard preview domains", () => {
  const allowedOrigins = ["https://meatlens.netlify.app", "https://*--meatlens.netlify.app"];

  expect(isOriginAllowed("https://meatlens.netlify.app", allowedOrigins)).toBeTruthy();
  expect(isOriginAllowed("https://deploy-preview-12--meatlens.netlify.app", allowedOrigins)).toBeTruthy();
  expect(isOriginAllowed("https://other-app.netlify.app", allowedOrigins)).toBeFalsy();
});

test("getAllowedOrigins falls back to localhost origins outside production", () => {
  expect(getAllowedOrigins({ NODE_ENV: "development" } as NodeJS.ProcessEnv)).toEqual([
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
  ]);
});

test("getAllowedOrigins requires explicit origins in production", () => {
  expect(getAllowedOrigins({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toEqual([]);
});

test("createCorsOptions allows requests without an origin header", async () => {
  const options = createCorsOptions([]);
  const originHandler = options.origin as NonNullable<typeof options.origin>;

  await new Promise<void>((resolve, reject) => {
    originHandler(undefined, (error, allow) => {
      try {
        expect(error).toBeNull();
        expect(allow).toBeTruthy();
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });
});

test("createCorsOptions enables credentials, exposes csrf headers, and echoes allowed origins", async () => {
  const options = createCorsOptions(["https://meatlens.netlify.app"]);
  const originHandler = options.origin as NonNullable<typeof options.origin>;

  expect(options.credentials).toBeTruthy();
  expect(options.allowedHeaders).toEqual(expect.arrayContaining(["Authorization", "Content-Type", "X-CSRF-Token"]));

  await new Promise<void>((resolve, reject) => {
    originHandler("https://meatlens.netlify.app", (error, allow) => {
      try {
        expect(error).toBeNull();
        expect(allow).toBe("https://meatlens.netlify.app");
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });
});
