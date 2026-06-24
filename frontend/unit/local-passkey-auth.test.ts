import assert from "node:assert/strict";
import test from "node:test";
import { webcrypto } from "node:crypto";
import { verifyLocalPasskeyAssertion } from "../src/lib/passkeys/localUnlock";

function encodeBase64Url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return Buffer.from(bytes).toString("base64url");
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function createAuthenticatorData(rpId: string, counter: number): Uint8Array {
  const data = new Uint8Array(37);
  const rpIdBytes = encodeUtf8(rpId);

  return webcrypto.subtle.digest("SHA-256", rpIdBytes).then((hashBuffer) => {
    data.set(new Uint8Array(hashBuffer), 0);
    data[32] = 0x05;
    data[33] = (counter >>> 24) & 0xff;
    data[34] = (counter >>> 16) & 0xff;
    data[35] = (counter >>> 8) & 0xff;
    data[36] = counter & 0xff;
    return data;
  });
}

test("verifies a local ES256 passkey assertion against the stored public key", async () => {
  const challenge = new Uint8Array([11, 22, 33, 44, 55, 66, 77, 88]);
  const origin = "http://localhost:8080";
  const rpId = "localhost";
  const keyPair = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const publicKey = await webcrypto.subtle.exportKey("spki", keyPair.publicKey);
  const authenticatorData = await createAuthenticatorData(rpId, 3);
  const clientDataJSON = encodeUtf8(JSON.stringify({
    type: "webauthn.get",
    challenge: encodeBase64Url(challenge),
    origin,
  }));
  const clientDataHash = await webcrypto.subtle.digest("SHA-256", clientDataJSON);
  const signedData = new Uint8Array(authenticatorData.length + clientDataHash.byteLength);
  signedData.set(authenticatorData, 0);
  signedData.set(new Uint8Array(clientDataHash), authenticatorData.length);
  const signature = await webcrypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    keyPair.privateKey,
    signedData,
  );

  const result = await verifyLocalPasskeyAssertion({
    storedCredential: {
      credentialId: "credential-local-1",
      publicKey: encodeBase64Url(publicKey),
      publicKeyAlgorithm: -7,
      transports: ["internal"],
      deviceLabel: "Office laptop",
      rpId,
      counter: 0,
      isAdmin: false,
    },
    credential: {
      id: "credential-local-1",
      rawId: encodeBase64Url(new Uint8Array([9, 9, 9, 9])),
      type: "public-key",
      clientExtensionResults: {},
      authenticatorAttachment: "platform",
      response: {
        clientDataJSON: encodeBase64Url(clientDataJSON),
        authenticatorData: encodeBase64Url(authenticatorData),
        signature: encodeBase64Url(signature),
        userHandle: null,
      },
    },
    expectedChallenge: challenge,
    expectedOrigin: origin,
  });

  assert.equal(result.verified, true);
  assert.equal(result.newCounter, 3);
});

test("rejects local passkey assertions with a mismatched challenge", async () => {
  const challenge = new Uint8Array([1, 2, 3, 4]);
  const origin = "http://localhost:8080";
  const rpId = "localhost";
  const keyPair = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const publicKey = await webcrypto.subtle.exportKey("spki", keyPair.publicKey);
  const authenticatorData = await createAuthenticatorData(rpId, 1);
  const clientDataJSON = encodeUtf8(JSON.stringify({
    type: "webauthn.get",
    challenge: encodeBase64Url(new Uint8Array([99, 88, 77, 66])),
    origin,
  }));
  const clientDataHash = await webcrypto.subtle.digest("SHA-256", clientDataJSON);
  const signedData = new Uint8Array(authenticatorData.length + clientDataHash.byteLength);
  signedData.set(authenticatorData, 0);
  signedData.set(new Uint8Array(clientDataHash), authenticatorData.length);
  const signature = await webcrypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    keyPair.privateKey,
    signedData,
  );

  const result = await verifyLocalPasskeyAssertion({
    storedCredential: {
      credentialId: "credential-local-2",
      publicKey: encodeBase64Url(publicKey),
      publicKeyAlgorithm: -7,
      transports: ["internal"],
      deviceLabel: "Current device",
      rpId,
      counter: 0,
      isAdmin: true,
    },
    credential: {
      id: "credential-local-2",
      rawId: encodeBase64Url(new Uint8Array([8, 8, 8, 8])),
      type: "public-key",
      clientExtensionResults: {},
      authenticatorAttachment: "platform",
      response: {
        clientDataJSON: encodeBase64Url(clientDataJSON),
        authenticatorData: encodeBase64Url(authenticatorData),
        signature: encodeBase64Url(signature),
        userHandle: null,
      },
    },
    expectedChallenge: challenge,
    expectedOrigin: origin,
  });

  assert.equal(result.verified, false);
});
