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
