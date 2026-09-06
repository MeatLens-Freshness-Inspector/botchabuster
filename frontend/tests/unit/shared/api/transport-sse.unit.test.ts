import assert from "node:assert/strict";
import test from "node:test";
import {
  decryptTransportSseStream,
  encryptTransportBytes,
  generateTransportRequestKey,
} from "../../../../src/shared/api/transport-crypto";

function streamFromChunks(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

test("decrypts fragmented encrypted SSE frames and preserves heartbeats", async () => {
  const generated = await generateTransportRequestKey();
  const aad = new TextEncoder().encode("GET /api/events");
  const inner = ["data: first\n\n", ": heartbeat\n\n", "data: second\n\n"];
  const frames: string[] = [];
  for (const value of inner) {
    const encrypted = await encryptTransportBytes(new TextEncoder().encode(value), generated.aesKey, aad);
    frames.push(`data: ${JSON.stringify({ version: 1, algorithm: "A256GCM", keyId: "test-v1", ...encrypted })}\n\n`);
  }
  const outer = new TextEncoder().encode(frames.join(""));
  const chunks = Array.from({ length: outer.length }, (_, index) => outer.slice(index, index + 1));
  const decrypted = decryptTransportSseStream(streamFromChunks(chunks), generated.aesKey, aad);

  assert.equal(await new Response(decrypted).text(), inner.join(""));
});

test("rejects malformed encrypted SSE frames", async () => {
  const generated = await generateTransportRequestKey();
  const aad = new TextEncoder().encode("GET /api/events");
  const stream = streamFromChunks([new TextEncoder().encode("data: not-json\n\n")]);

  await assert.rejects(() => new Response(
    decryptTransportSseStream(stream, generated.aesKey, aad),
  ).text(), /Invalid encrypted SSE stream/);
});
