import assert from "node:assert/strict";
import express from "express";
import { randomBytes } from "node:crypto";
import test from "node:test";
import {
  decryptAesGcm,
  getTransportAad,
  parseEncryptedTransportEnvelope,
  wrapAesKey,
} from "../../../src/modules/transport/infrastructure/TransportCrypto";
import { globalErrorHandler } from "../../../src/middleware/errorHandler";
import { createTestTransportKeyStore } from "../../../src/modules/transport/infrastructure/TransportKeyStore";
import { createTransportMiddleware } from "../../../src/middleware/transport";
import { startTestServer } from "../../support/appFactory";

async function requestEncryptedError(
  baseUrl: string,
  store: ReturnType<typeof createTestTransportKeyStore>,
  path: string,
): Promise<{ response: Response; rawBody: string; logicalBody: string }> {
  const aesKey = randomBytes(32);
  const response = await fetch(baseUrl + path, {
    headers: {
      "X-Transport-Key": store.keyId + "." + wrapAesKey(aesKey, store.publicKey),
    },
  });
  const rawBody = await response.text();
  const envelope = parseEncryptedTransportEnvelope(JSON.parse(rawBody) as unknown, {
    expectedKeyId: store.keyId,
    maxCiphertextBytes: 4096,
  });
  const logicalBody = decryptAesGcm(
    envelope,
    aesKey,
    getTransportAad("GET", path),
  ).toString("utf8");
  return { response, rawBody, logicalBody };
}

test("transport middleware encrypts route and global error responses", async () => {
  const store = createTestTransportKeyStore();
  const app = express();
  app.use(express.json());
  app.use(createTransportMiddleware(store, { maxPayloadBytes: 1024 }));
  app.get("/unauthorized", (_req, res) => res.status(401).json({ error: "auth secret" }));
  app.get("/forbidden", (_req, res) => res.status(403).json({ error: "permission secret" }));
  app.get("/failure", (_req, _res, next) => next(new Error("internal secret")));
  app.use(globalErrorHandler);

  const { baseUrl, close } = await startTestServer(app);
  try {
    for (const [path, status, message] of [
      ["/unauthorized", 401, "auth secret"],
      ["/forbidden", 403, "permission secret"],
      ["/failure", 500, "Internal server error"],
      ["/missing", 404, "Cannot GET /missing"],
    ] as const) {
      const result = await requestEncryptedError(baseUrl, store, path);
      assert.equal(result.response.status, status);
      assert.doesNotMatch(result.rawBody, new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(result.logicalBody, new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  } finally {
    await close();
  }
});
