const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
const SESSION_STORAGE_KEY = "meatlens-auth-session";

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json() as { error?: unknown; message?: unknown };
    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }
    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }
  } catch {
    // Ignore JSON parse errors and fall through.
  }

  if (response.statusText && response.statusText.trim().length > 0) {
    return `${fallback}: ${response.statusText}`;
  }

  return fallback;
}

export interface WebAuthnCredentialDescriptorJSON {
  id: string;
  type: PublicKeyCredentialType;
  transports?: AuthenticatorTransport[];
}

export interface RegistrationOptionsJSON {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: PublicKeyCredentialType;
    alg: number;
  }>;
  timeout?: number;
  excludeCredentials?: WebAuthnCredentialDescriptorJSON[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
}

export interface AuthenticationOptionsJSON {
  challenge: string;
  timeout?: number;
  rpId: string;
  allowCredentials?: WebAuthnCredentialDescriptorJSON[];
  userVerification?: UserVerificationRequirement;
}

export interface RegistrationResponseJSON {
  id: string;
  rawId: string;
  type: PublicKeyCredentialType;
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
  authenticatorAttachment: string | null;
  response: {
    clientDataJSON: string;
    attestationObject: string;
    transports?: AuthenticatorTransport[];
    publicKey?: string | null;
    publicKeyAlgorithm?: number | null;
    authenticatorData?: string | null;
  };
}

export interface AuthenticationResponseJSON {
  id: string;
  rawId: string;
  type: PublicKeyCredentialType;
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
  authenticatorAttachment: string | null;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle: string | null;
  };
}

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthSession {
  access_token: string | null;
  refresh_token: string | null;
  token_type: string | null;
  expires_in: number | null;
  expires_at: number | null;
}

export interface RegisteredPasskey {
  credentialId: string;
  deviceLabel: string;
  transports: AuthenticatorTransport[];
  createdAt: string;
  lastUsedAt: string | null;
  localDeviceReady: boolean;
}

export class PasskeyClient {
  private static instance: PasskeyClient;

  private constructor() {}

  static getInstance(): PasskeyClient {
    if (!PasskeyClient.instance) {
      PasskeyClient.instance = new PasskeyClient();
    }
    return PasskeyClient.instance;
  }

  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;

    try {
      const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (!rawSession) return null;

      const parsedSession = JSON.parse(rawSession) as { access_token?: string | null };
      return parsedSession.access_token ?? null;
    } catch {
      return null;
    }
  }

  private createHeaders(initialHeaders?: HeadersInit): Headers {
    const headers = new Headers(initialHeaders);
    const accessToken = this.getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return headers;
  }

  async getRegistrationOptions(): Promise<{ challengeId: string; options: RegistrationOptionsJSON }> {
    const res = await fetch(`${API_BASE_URL}/auth/passkeys/register/options`, {
      method: "POST",
      headers: this.createHeaders(),
    });

    if (!res.ok) throw new Error(await readApiError(res, "Failed to prepare passkey registration"));
    return res.json();
  }

  async verifyRegistration(payload: {
    challengeId: string;
    credential: RegistrationResponseJSON;
    deviceLabel: string;
  }): Promise<RegisteredPasskey> {
    const res = await fetch(`${API_BASE_URL}/auth/passkeys/register/verify`, {
      method: "POST",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(await readApiError(res, "Failed to verify passkey registration"));
    return res.json();
  }

  async getAuthenticationOptions(): Promise<{ challengeId: string; options: AuthenticationOptionsJSON }> {
    const res = await fetch(`${API_BASE_URL}/auth/passkeys/authenticate/options`, {
      method: "POST",
      headers: this.createHeaders(),
    });

    if (!res.ok) throw new Error(await readApiError(res, "Failed to prepare passkey sign-in"));
    return res.json();
  }

  async verifyAuthentication(payload: {
    challengeId: string;
    credential: AuthenticationResponseJSON;
  }): Promise<{ user: AuthUser; session: AuthSession | null }> {
    const res = await fetch(`${API_BASE_URL}/auth/passkeys/authenticate/verify`, {
      method: "POST",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(await readApiError(res, "Failed to verify passkey sign-in"));
    return res.json();
  }

  async listPasskeys(): Promise<RegisteredPasskey[]> {
    const res = await fetch(`${API_BASE_URL}/auth/passkeys`, {
      headers: this.createHeaders(),
    });

    if (!res.ok) throw new Error(await readApiError(res, "Failed to load registered passkeys"));
    return res.json();
  }

  async deletePasskey(credentialId: string): Promise<void> {
    const encodedCredentialId = encodeURIComponent(credentialId);
    const res = await fetch(`${API_BASE_URL}/auth/passkeys/${encodedCredentialId}`, {
      method: "DELETE",
      headers: this.createHeaders(),
    });

    if (!res.ok) throw new Error(await readApiError(res, "Failed to remove passkey"));
  }
}

export const passkeyClient = PasskeyClient.getInstance();
