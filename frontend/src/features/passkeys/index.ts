export {
  PasskeyClient,
  passkeyClient,
  type AuthenticationOptionsJSON,
  type AuthenticationResponseJSON,
  type RegisteredPasskey,
  type RegistrationOptionsJSON,
  type RegistrationResponseJSON,
  type WebAuthnCredentialDescriptorJSON,
} from "./api";
export {
  canUsePasskeys,
  getDefaultPasskeyDeviceLabel,
  startPasskeyAuthentication,
  startPasskeyRegistration,
} from "./lib/browser";
export {
  createLocalPasskeyAuthenticationOptions,
  createLocalPasskeyChallenge,
  verifyLocalPasskeyAssertion,
  type StoredLocalPasskey,
} from "./lib/local-unlock";
export {
  clearLegacyOfflineUnlockRequired,
  clearLegacyStoredLocalPasskey,
  clearStoredLocalPasskey,
  getLegacyOfflineUnlockRequired,
  getLegacyStoredLocalPasskey,
  getStoredLocalPasskey,
  isOfflineUnlockRequired,
  setOfflineUnlockRequired,
  storeLocalPasskey,
} from "./model/local-passkey-storage";
