import type {
  AuthenticationOptionsJSON,
  AuthenticationResponseJSON,
} from "@/integrations/api/PasskeyClient";

export const LOCAL_PASSKEY_STORAGE_KEY = "meatlens-local-passkey";
export const OFFLINE_UNLOCK_REQUIRED_STORAGE_KEY = "meatlens-auth-offline-lock-required";

export interface StoredLocalPasskey {
  credentialId: string;
  publicKey: string;
  publicKeyAlgorithm: number;
  transports: AuthenticatorTransport[];
  deviceLabel: string;
  rpId: string;
  counter: number;
  isAdmin: boolean;
}

interface VerifyLocalPasskeyAssertionInput {
  storedCredential: StoredLocalPasskey;
  credential: AuthenticationResponseJSON;
  expectedChallenge: Uint8Array;
  expectedOrigin: string;
}

interface VerifyLocalPasskeyAssertionResult {
  verified: boolean;
  newCounter: number;
}

function encodeBase64Url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";

  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }

  return diff === 0;
}

function parseCounter(authenticatorData: Uint8Array): number {
  return (
    (authenticatorData[33] << 24) |
    (authenticatorData[34] << 16) |
    (authenticatorData[35] << 8) |
    authenticatorData[36]
  ) >>> 0;
}

function getWebCrypto(): Crypto {
  if (typeof globalThis.crypto?.subtle === "undefined") {
    throw new Error("WebCrypto is not available");
  }

  return globalThis.crypto;
}

export function getStoredLocalPasskey(): StoredLocalPasskey | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LOCAL_PASSKEY_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredLocalPasskey>;
    if (
      typeof parsed.credentialId !== "string" ||
      typeof parsed.publicKey !== "string" ||
      typeof parsed.publicKeyAlgorithm !== "number" ||
      typeof parsed.deviceLabel !== "string" ||
      typeof parsed.rpId !== "string"
    ) {
      return null;
    }

    return {
      credentialId: parsed.credentialId,
      publicKey: parsed.publicKey,
      publicKeyAlgorithm: parsed.publicKeyAlgorithm,
      transports: Array.isArray(parsed.transports) ? parsed.transports as AuthenticatorTransport[] : [],
      deviceLabel: parsed.deviceLabel,
      rpId: parsed.rpId,
      counter: typeof parsed.counter === "number" ? parsed.counter : 0,
      isAdmin: Boolean(parsed.isAdmin),
    };
  } catch {
    return null;
  }
}

export function storeLocalPasskey(passkey: StoredLocalPasskey): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_PASSKEY_STORAGE_KEY, JSON.stringify(passkey));
}

export function clearStoredLocalPasskey(credentialId?: string): void {
  if (typeof window === "undefined") return;

  if (!credentialId) {
    window.localStorage.removeItem(LOCAL_PASSKEY_STORAGE_KEY);
    return;
  }

  const storedPasskey = getStoredLocalPasskey();
  if (storedPasskey?.credentialId === credentialId) {
    window.localStorage.removeItem(LOCAL_PASSKEY_STORAGE_KEY);
  }
}

export function isOfflineUnlockRequired(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(OFFLINE_UNLOCK_REQUIRED_STORAGE_KEY) === "true";
}

export function setOfflineUnlockRequired(required: boolean): void {
  if (typeof window === "undefined") return;

  if (required) {
    window.localStorage.setItem(OFFLINE_UNLOCK_REQUIRED_STORAGE_KEY, "true");
    return;
  }

  window.localStorage.removeItem(OFFLINE_UNLOCK_REQUIRED_STORAGE_KEY);
}

export function createLocalPasskeyChallenge(): Uint8Array {
  const challenge = new Uint8Array(32);
  getWebCrypto().getRandomValues(challenge);
  return challenge;
}

export function createLocalPasskeyAuthenticationOptions(
  passkey: StoredLocalPasskey,
  challenge: Uint8Array,
): AuthenticationOptionsJSON {
  return {
    challenge: encodeBase64Url(challenge),
    rpId: passkey.rpId,
    allowCredentials: [
      {
        id: passkey.credentialId,
        type: "public-key",
        transports: passkey.transports,
      },
    ],
    userVerification: "required",
  };
}

export async function verifyLocalPasskeyAssertion(
  input: VerifyLocalPasskeyAssertionInput,
): Promise<VerifyLocalPasskeyAssertionResult> {
  const { storedCredential, credential, expectedChallenge, expectedOrigin } = input;

  if (storedCredential.publicKeyAlgorithm !== -7) {
    return { verified: false, newCounter: storedCredential.counter };
  }

  if (credential.id !== storedCredential.credentialId) {
    return { verified: false, newCounter: storedCredential.counter };
  }

  try {
    const webCrypto = getWebCrypto();
    const clientDataBytes = decodeBase64Url(credential.response.clientDataJSON);
    const authenticatorData = decodeBase64Url(credential.response.authenticatorData);
    const signature = decodeBase64Url(credential.response.signature);

    if (authenticatorData.length < 37) {
      return { verified: false, newCounter: storedCredential.counter };
    }

    const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes)) as {
      type?: string;
      challenge?: string;
      origin?: string;
    };

    if (clientData.type !== "webauthn.get") {
      return { verified: false, newCounter: storedCredential.counter };
    }

    if (clientData.challenge !== encodeBase64Url(expectedChallenge)) {
      return { verified: false, newCounter: storedCredential.counter };
    }

    if (clientData.origin !== expectedOrigin) {
      return { verified: false, newCounter: storedCredential.counter };
    }

    const flags = authenticatorData[32];
    const userPresent = (flags & 0x01) !== 0;
    const userVerified = (flags & 0x04) !== 0;

    if (!userPresent || !userVerified) {
      return { verified: false, newCounter: storedCredential.counter };
    }

    const expectedRpIdHash = new Uint8Array(
      await webCrypto.subtle.digest("SHA-256", new TextEncoder().encode(storedCredential.rpId)),
    );
    const actualRpIdHash = authenticatorData.slice(0, 32);

    if (!bytesEqual(actualRpIdHash, expectedRpIdHash)) {
      return { verified: false, newCounter: storedCredential.counter };
    }

    const newCounter = parseCounter(authenticatorData);
    if (storedCredential.counter > 0 && newCounter > 0 && newCounter <= storedCredential.counter) {
      return { verified: false, newCounter: storedCredential.counter };
    }

    const clientDataHash = new Uint8Array(
      await webCrypto.subtle.digest("SHA-256", clientDataBytes),
    );
    const signedData = new Uint8Array(authenticatorData.length + clientDataHash.length);
    signedData.set(authenticatorData, 0);
    signedData.set(clientDataHash, authenticatorData.length);

    const publicKey = await webCrypto.subtle.importKey(
      "spki",
      decodeBase64Url(storedCredential.publicKey),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const verified = await webCrypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      signature,
      signedData,
    );

    return { verified, newCounter: verified ? newCounter : storedCredential.counter };
  } catch {
    return { verified: false, newCounter: storedCredential.counter };
  }
}
