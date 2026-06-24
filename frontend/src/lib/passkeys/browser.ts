import type {
  AuthenticationOptionsJSON,
  AuthenticationResponseJSON,
  RegistrationOptionsJSON,
  RegistrationResponseJSON,
  WebAuthnCredentialDescriptorJSON,
} from "@/integrations/api/PasskeyClient";

function encodeBase64Url(input: ArrayBuffer): string {
  const bytes = new Uint8Array(input);
  let binary = "";

  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(input: string): ArrayBuffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function mapCredentialDescriptor(
  descriptor: WebAuthnCredentialDescriptorJSON,
): PublicKeyCredentialDescriptor {
  return {
    id: decodeBase64Url(descriptor.id),
    type: descriptor.type,
    transports: descriptor.transports,
  };
}

function serializeAuthenticatorAttachment(
  credential: PublicKeyCredential,
): string | null {
  return typeof credential.authenticatorAttachment === "string"
    ? credential.authenticatorAttachment
    : null;
}

function isPublicKeyCredentialLike(value: unknown): value is PublicKeyCredential {
  if (!value || typeof value !== "object") return false;

  return "id" in value && "type" in value && "response" in value;
}

export async function canUsePasskeys(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (typeof window.PublicKeyCredential === "undefined") return false;
  if (!navigator.credentials) return false;

  const availabilityCheck = (
    window.PublicKeyCredential as typeof PublicKeyCredential & {
      isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
    }
  ).isUserVerifyingPlatformAuthenticatorAvailable;

  if (typeof availabilityCheck !== "function") {
    return true;
  }

  try {
    return await availabilityCheck();
  } catch {
    return false;
  }
}

export async function startPasskeyRegistration(
  options: RegistrationOptionsJSON,
): Promise<RegistrationResponseJSON> {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: decodeBase64Url(options.challenge),
      rp: options.rp,
      user: {
        ...options.user,
        id: decodeBase64Url(options.user.id),
      },
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      excludeCredentials: options.excludeCredentials?.map(mapCredentialDescriptor),
      authenticatorSelection: options.authenticatorSelection,
      attestation: options.attestation,
    },
  });

  if (!isPublicKeyCredentialLike(credential)) {
    throw new Error("Passkey registration was cancelled");
  }

  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: serializeAuthenticatorAttachment(credential),
    response: {
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      attestationObject: encodeBase64Url(response.attestationObject),
      transports: typeof response.getTransports === "function" ? response.getTransports() : undefined,
      publicKey: typeof response.getPublicKey === "function" && response.getPublicKey()
        ? encodeBase64Url(response.getPublicKey()!)
        : null,
      publicKeyAlgorithm: typeof response.getPublicKeyAlgorithm === "function"
        ? response.getPublicKeyAlgorithm()
        : null,
      authenticatorData: typeof response.getAuthenticatorData === "function"
        ? encodeBase64Url(response.getAuthenticatorData())
        : null,
    },
  };
}

export async function startPasskeyAuthentication(
  options: AuthenticationOptionsJSON,
): Promise<AuthenticationResponseJSON> {
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: decodeBase64Url(options.challenge),
      timeout: options.timeout,
      rpId: options.rpId,
      allowCredentials: options.allowCredentials?.map(mapCredentialDescriptor),
      userVerification: options.userVerification,
    },
  });

  if (!isPublicKeyCredentialLike(credential)) {
    throw new Error("Passkey sign-in was cancelled");
  }

  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: serializeAuthenticatorAttachment(credential),
    response: {
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      authenticatorData: encodeBase64Url(response.authenticatorData),
      signature: encodeBase64Url(response.signature),
      userHandle: response.userHandle ? encodeBase64Url(response.userHandle) : null,
    },
  };
}

export function getDefaultPasskeyDeviceLabel(): string {
  if (typeof navigator === "undefined") {
    return "Current device";
  }

  const platform = (navigator.userAgentData?.platform || navigator.platform || "").trim();
  if (platform.length > 0) {
    return `${platform} device`;
  }

  return "Current device";
}
