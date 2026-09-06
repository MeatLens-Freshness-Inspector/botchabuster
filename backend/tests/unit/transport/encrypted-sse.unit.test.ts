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
import { createTestTransportKeyStore } from "../../../src/modules/transport/infrastructure/TransportKeyStore";
import { createTransportMiddleware } from "../../../src/middleware/transport";
import { startTestServer } from "../../support/appFactory";

test("encrypts every SSE chunk while preserving inner event bytes", async () => {
  const store = createTestTransportKeyStore();
  const aesKey = randomBytes(32);
  const app = express();
  app.use(createTransportMiddleware(store, { maxPayloadBytes: 1024 }));
  app.get("/events", (_req, res) => {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.write("data: secret assistant text\n\n");
    res.write(": heartbeat\n\n");
    res.end();
  });

  const { baseUrl, close } = await startTestServer(app);
  try {
    const response = await fetch(baseUrl + "/events", {
      headers: { "X-Transport-Key": `${store.keyId}.${wrapAesKey(aesKey, store.publicKey)}` },
    });
    const rawBody = await response.text();
    const plaintextChunks: string[] = [];
    for (const frame of rawBody.split("\n\n").filter(Boolean)) {
      assert.match(frame, /^data: /);
      const envelope = parseEncryptedTransportEnvelope(JSON.parse(frame.slice(6)) as unknown, {
        expectedKeyId: store.keyId,
        maxCiphertextBytes: 4096,
      });
      plaintextChunks.push(decryptAesGcm(envelope, aesKey, getTransportAad("GET", "/events")).toString("utf8"));
    }

    assert.equal(response.status, 200);
    assert.doesNotMatch(rawBody, /secret assistant text/);
    assert.deepEqual(plaintextChunks, ["data: secret assistant text\n\n", ": heartbeat\n\n"]);
  } finally {
    await close();
  }
});
