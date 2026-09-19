import assert from "node:assert/strict";
import express from "express";
import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
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

test("encrypted SSE preserves binary download chunks and exposes the logical size header", async () => {
  const store = createTestTransportKeyStore();
  const aesKey = randomBytes(32);
  const app = express();
  app.use(createTransportMiddleware(store, { maxPayloadBytes: 1024 }));
  app.get("/download", (_req, res) => {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("X-Export-Content-Length", "4");
    res.write(Buffer.from([0, 255]));
    res.end(Buffer.from([1, 128]));
  });

  const { baseUrl, close } = await startTestServer(app);
  try {
    const response = await fetch(baseUrl + "/download", {
      headers: { "X-Transport-Key": `${store.keyId}.${wrapAesKey(aesKey, store.publicKey)}` },
    });
    const rawBody = await response.text();
    const plaintextChunks: Buffer[] = [];
    for (const frame of rawBody.split("\n\n").filter(Boolean)) {
      const envelope = parseEncryptedTransportEnvelope(JSON.parse(frame.slice(6)) as unknown, {
        expectedKeyId: store.keyId,
        maxCiphertextBytes: 4096,
      });
      plaintextChunks.push(decryptAesGcm(envelope, aesKey, getTransportAad("GET", "/download")));
    }

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-export-content-length"), "4");
    assert.deepEqual(Buffer.concat(plaintextChunks), Buffer.from([0, 255, 1, 128]));
  } finally {
    await close();
  }
});

test("encrypted SSE supports Node pipeline callbacks for file downloads", async () => {
  const store = createTestTransportKeyStore();
  const aesKey = randomBytes(32);
  const app = express();
  app.use(createTransportMiddleware(store, { maxPayloadBytes: 1024 }));
  app.get("/pipeline-download", (_req, res) => {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    void pipeline(Readable.from([Buffer.from([0x50, 0x4b, 0x03, 0x04])]), res);
  });

  const { baseUrl, close } = await startTestServer(app);
  try {
    const response = await fetch(baseUrl + "/pipeline-download", {
      headers: { "X-Transport-Key": `${store.keyId}.${wrapAesKey(aesKey, store.publicKey)}` },
    });
    const rawBody = await response.text();
    const plaintextChunks: Buffer[] = [];
    for (const frame of rawBody.split("\n\n").filter(Boolean)) {
      const envelope = parseEncryptedTransportEnvelope(JSON.parse(frame.slice(6)) as unknown, {
        expectedKeyId: store.keyId,
        maxCiphertextBytes: 4096,
      });
      plaintextChunks.push(decryptAesGcm(envelope, aesKey, getTransportAad("GET", "/pipeline-download")));
    }

    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.concat(plaintextChunks), Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  } finally {
    await close();
  }
});
