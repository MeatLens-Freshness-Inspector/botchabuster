import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeBase64Url,
  encodeBase64Url,
} from "../../../src/modules/transport/infrastructure/TransportCrypto";

test("base64url codecs round-trip arbitrary binary bytes", () => {
  const input = Uint8Array.from([0, 1, 2, 127, 128, 254, 255]);
  const encoded = encodeBase64Url(input);

  assert.equal(encoded, "AAECf4D-_w");
  assert.deepEqual(decodeBase64Url(encoded), input);
});

test("base64url decoder rejects non-canonical transport values", () => {
  for (const invalid of ["AAECf4D-_w=", " AAECf4D-_w", "AAECf4D+_w", "AAECf4D"]) {
    assert.throws(() => decodeBase64Url(invalid), /invalid base64url/i);
  }
});
