import { webcrypto } from "node:crypto";
import { expect, test } from "@playwright/test";

function encodeBase64Url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return Buffer.from(bytes).toString("base64url");
}

async function exportKeyPair() {
  const keyPair = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );

  return {
    publicKey: encodeBase64Url(await webcrypto.subtle.exportKey("spki", keyPair.publicKey)),
    privateKey: encodeBase64Url(await webcrypto.subtle.exportKey("pkcs8", keyPair.privateKey)),
  };
}

test("unlocks a cached offline session with a local passkey", async ({ page }) => {
  const keyPair = await exportKeyPair();

  await page.addInitScript((keys) => {
    const encoder = new TextEncoder();

    function encodeBase64Url(input) {
      const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
      let binary = "";
      for (const value of bytes) {
        binary += String.fromCharCode(value);
      }
      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    function decodeBase64Url(input) {
      const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes.buffer;
    }

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    class FakePublicKeyCredential {}
    Object.defineProperty(window, "PublicKeyCredential", {
      configurable: true,
      value: FakePublicKeyCredential,
    });
    Object.defineProperty(FakePublicKeyCredential, "isUserVerifyingPlatformAuthenticatorAvailable", {
      configurable: true,
      value: async () => true,
    });

    window.localStorage.setItem("meatlens-auth-user", JSON.stringify({
      id: "user-1",
      email: "inspector@example.com",
    }));
    window.localStorage.setItem("meatlens-auth-session", JSON.stringify({
      access_token: "cached-offline-token",
      refresh_token: null,
      token_type: "bearer",
      expires_in: 28800,
      expires_at: Date.now() + 28_800_000,
    }));
    window.localStorage.setItem("meatlens-auth-offline-lock-required", "true");
    window.localStorage.setItem("meatlens-local-passkey", JSON.stringify({
      credentialId: "credential-local-1",
      publicKey: keys.publicKey,
      publicKeyAlgorithm: -7,
      transports: ["internal"],
      deviceLabel: "Current device",
      rpId: "localhost",
      counter: 0,
      isAdmin: false,
    }));

    Object.defineProperty(navigator, "credentials", {
      configurable: true,
      value: {
        async get({ publicKey }) {
          const privateKey = await crypto.subtle.importKey(
            "pkcs8",
            decodeBase64Url(keys.privateKey),
            { name: "ECDSA", namedCurve: "P-256" },
            false,
            ["sign"],
          );

          const challengeBytes = new Uint8Array(publicKey.challenge);
          const rpIdHash = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode("localhost")));
          const authenticatorData = new Uint8Array(37);
          authenticatorData.set(rpIdHash, 0);
          authenticatorData[32] = 0x05;
          authenticatorData[36] = 1;

          const clientDataJSON = encoder.encode(JSON.stringify({
            type: "webauthn.get",
            challenge: encodeBase64Url(challengeBytes),
            origin: window.location.origin,
          }));
          const clientDataHash = await crypto.subtle.digest("SHA-256", clientDataJSON);
          const signedData = new Uint8Array(authenticatorData.length + clientDataHash.byteLength);
          signedData.set(authenticatorData, 0);
          signedData.set(new Uint8Array(clientDataHash), authenticatorData.length);
          const signature = await crypto.subtle.sign(
            { name: "ECDSA", hash: "SHA-256" },
            privateKey,
            signedData,
          );

          return {
            id: "credential-local-1",
            rawId: Uint8Array.from([1, 2, 3, 4]).buffer,
            type: "public-key",
            authenticatorAttachment: "platform",
            response: {
              clientDataJSON: clientDataJSON.buffer,
              authenticatorData: authenticatorData.buffer,
              signature,
              userHandle: null,
            },
            getClientExtensionResults: () => ({}),
          };
        },
      },
    });
  }, keyPair);

  await page.goto("/login");

  await expect(page.getByRole("button", { name: /unlock with passkey/i })).toBeVisible();
  await page.getByRole("button", { name: /unlock with passkey/i }).click();
  await expect(page).toHaveURL(/\/inspect$/);
});
