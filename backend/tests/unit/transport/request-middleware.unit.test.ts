import assert from "node:assert/strict";
import express from "express";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { createEncryptedTransportEnvelope, getTransportAad, wrapAesKey } from "../../../src/modules/transport/infrastructure/TransportCrypto";
import { createTestTransportKeyStore } from "../../../src/modules/transport/infrastructure/TransportKeyStore";
import { createTransportMiddleware } from "../../../src/middleware/transport";
import { startTestServer } from "../../support/appFactory";

async function createEncryptedRequest(
  store: ReturnType<typeof createTestTransportKeyStore>,
  method: string,
  path: string,
  body: unknown,
): Promise<{ body: string; transportKey: string }> {
  const aesKey = randomBytes(32);
  const transportKey = store.keyId + "." + wrapAesKey(aesKey, store.publicKey);
  const logicalPayload = JSON.stringify({
    kind: "json",
    contentType: "application/json",
    value: JSON.stringify(body),
  });
  const envelope = createEncryptedTransportEnvelope(
    store.keyId,
    Buffer.from(logicalPayload),
    aesKey,
    getTransportAad(method, path),
  );
  return { body: JSON.stringify(envelope), transportKey };
}

test("transport middleware decrypts JSON before the controller runs", async () => {
  const store = createTestTransportKeyStore();
  const app = express();
  app.use(express.json());
  app.use(createTransportMiddleware(store, { maxPayloadBytes: 1024 }));
  app.post("/echo", (req, res) => {
    res.json({ body: req.body, hasContext: Boolean(req.transportContext) });
  });

  const { baseUrl, close } = await startTestServer(app);
  try {
    const encrypted = await createEncryptedRequest(store, "POST", "/echo", { ok: true });
    const response = await fetch(baseUrl + "/echo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Transport-Key": encrypted.transportKey,
      },
      body: encrypted.body,
    });
    const payload = await response.json() as { body?: unknown; hasContext?: boolean };

    assert.equal(response.status, 200);
    assert.deepEqual(payload.body, { ok: true });
    assert.equal(payload.hasContext, true);
  } finally {
    await close();
  }
});

test("transport middleware rejects malformed request keys generically", async () => {
  const store = createTestTransportKeyStore();
  const app = express();
  app.use(express.json());
  app.use(createTransportMiddleware(store, { maxPayloadBytes: 1024 }));
  app.get("/echo", (_req, res) => res.json({ ok: true }));

  const { baseUrl, close } = await startTestServer(app);
  try {
    const response = await fetch(baseUrl + "/echo", {
      headers: { "X-Transport-Key": "v1.not-valid" },
    });
    const payload = await response.json() as { error?: string };

    assert.equal(response.status, 400);
    assert.equal(payload.error, "Invalid encrypted request");
  } finally {
    await close();
  }
});
