import {
  createPrivateKey,
  createPublicKey,
  type KeyObject,
} from "node:crypto";
import {
  TRANSPORT_VERSION,
  type TransportPublicKey,
} from "../domain/transport";
import { encodeBase64Url } from "./TransportCrypto";

export interface TransportKeyStore {
  readonly keyId: string;
  readonly privateKey: KeyObject;
  readonly publicKey: KeyObject;
  publicKeyMetadata(): TransportPublicKey;
}

export interface TransportKeyStoreOptions {
  privateKey?: string | KeyObject;
  keyId?: string;
  nodeEnv?: string;
}

export function createTransportKeyStore(options: TransportKeyStoreOptions): TransportKeyStore {
  const keyId = options.keyId?.trim() || "v1";
  if (!options.privateKey) {
    throw new Error(
      options.nodeEnv === "production"
        ? "Transport private key is required in production"
        : "Transport private key is required",
    );
  }

  let privateKey: KeyObject;
  try {
    privateKey = typeof options.privateKey === "string"
      ? createPrivateKey(options.privateKey.replace(/\\n/g, "\n"))
      : options.privateKey;
    if (privateKey.type !== "private" || privateKey.asymmetricKeyType !== "rsa") {
      throw new Error("wrong key type");
    }
  } catch {
    throw new Error("Transport private key is invalid");
  }

  const publicKey = createPublicKey(privateKey);
  return {
    keyId,
    privateKey,
    publicKey,
    publicKeyMetadata(): TransportPublicKey {
      const der = publicKey.export({ type: "spki", format: "der" });
      return {
        version: TRANSPORT_VERSION,
        algorithm: "RSA-OAEP-256",
        keyId,
        publicKey: encodeBase64Url(new Uint8Array(der)),
      };
    },
  };
}

export type { TransportPublicKey };
