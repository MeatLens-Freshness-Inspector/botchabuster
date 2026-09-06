import assert from "node:assert/strict";
import express from "express";
import { randomBytes } from "node:crypto";
import test from "node:test";
import {
  createEncryptedTransportEnvelope,
  decryptAesGcm,
  getTransportAad,
  parseEncryptedTransportEnvelope,
  wrapAesKey,
} from "../../../src/modules/transport/infrastructure/TransportCrypto";
import { createTestTransportKeyStore } from "../../../src/modules/transport/infrastructure/TransportKeyStore";
import { createTransportMiddleware } from "../../../src/middleware/transport";
import { startTestServer } from "../../support/appFactory";

test("transport middleware encrypts JSON responses while preserving logical metadata", async () => {
  const store = createTestTransportKeyStore();
  const aesKey = randomBytes(32);
  const app = express();
  app.use(express.json());
  app.use(createTransportMiddleware(store, { maxPayloadBytes: 1024 }));
  app.get("/echo", (_req, res) => {
    res.setHeader("X-Logical-Header", "kept-inside");
    res.json({ secret: "not-readable-on-wire" });
  });

  const { baseUrl, close } = await startTestServer(app);
  try {
    const response = await fetch(baseUrl + "/echo", {
      headers: {
        "X-Transport-Key": store.keyId + "." + wrapAesKey(aesKey, store.publicKey),
      },
    });
    const rawBody = await response.text();
    const envelope = JSON.parse(rawBody) as Record<string, unknown>;
    const parsed = parseEncryptedTransportEnvelope(envelope, {
      expectedKeyId: store.keyId,
      maxCiphertextBytes: 4096,
    });
    const logical = JSON.parse(
      decryptAesGcm(parsed, aesKey, getTransportAad("GET", "/echo")).toString("utf8"),
    ) as {
      body?: string;
      headers?: Record<string, string>;
      contentType?: string;
    };

    assert.equal(response.status, 200);
    assert.doesNotMatch(rawBody, /not-readable-on-wire/);
    assert.equal(logical.body, JSON.stringify({ secret: "not-readable-on-wire" }));
    assert.equal(logical.headers?.["x-logical-header"], "kept-inside");
    assert.equal(logical.contentType, "application/json; charset=utf-8");
  } finally {
    await close();
  }
});
