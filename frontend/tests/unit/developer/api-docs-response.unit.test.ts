import assert from "node:assert/strict";
import test from "node:test";
import { readApiDocsResponse } from "../../../src/features/developer-tools";

test("pretty-prints JSON and preserves response metadata", async () => {
  const response = new Response(JSON.stringify({ ok: true, count: 2 }), {
    status: 200,
    statusText: "OK",
    headers: { "Content-Type": "application/json", "X-Trace": "trace-1" },
  });

  const result = await readApiDocsResponse(response, 18);

  assert.equal(result.status, 200);
  assert.equal(result.statusText, "OK");
  assert.equal(result.elapsedMs, 18);
  assert.equal(result.bodyKind, "json");
  assert.equal(result.displayBody, '{\n  "ok": true,\n  "count": 2\n}');
  assert.equal(result.headers["x-trace"], "trace-1");
  assert.ok(result.sizeBytes > 0);
});

test("preserves text responses", async () => {
  const result = await readApiDocsResponse(
    new Response("service ready", { status: 200, headers: { "Content-Type": "text/plain" } }),
    4,
  );

  assert.equal(result.bodyKind, "text");
  assert.equal(result.displayBody, "service ready");
});

test("represents empty responses without a fake body", async () => {
  const result = await readApiDocsResponse(new Response(null, { status: 204 }), 1);

  assert.equal(result.bodyKind, "empty");
  assert.equal(result.displayBody, "");
  assert.equal(result.sizeBytes, 0);
});

test("extracts API error messages while retaining response details", async () => {
  const result = await readApiDocsResponse(
    new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      statusText: "Forbidden",
      headers: { "Content-Type": "application/json" },
    }),
    9,
  );

  assert.equal(result.ok, false);
  assert.equal(result.errorMessage, "Forbidden");
  assert.equal(result.displayBody, '{\n  "error": "Forbidden"\n}');
});

test("keeps binary responses downloadable instead of decoding them as text", async () => {
  const result = await readApiDocsResponse(
    new Response(new Uint8Array([80, 75, 3, 4]), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=dataset.zip",
      },
    }),
    7,
  );

  assert.equal(result.bodyKind, "blob");
  assert.equal(result.sizeBytes, 4);
  assert.equal(result.fileName, "dataset.zip");
  assert.ok(result.binaryBody instanceof Blob);
});
