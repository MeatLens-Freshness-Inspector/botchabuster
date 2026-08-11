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
