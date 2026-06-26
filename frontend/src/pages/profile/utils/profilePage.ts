import type { RegisteredPasskey } from "@/integrations/api/PasskeyClient";
import { getStoredLocalPasskey } from "@/lib/passkeys/localUnlock";

export function getProfileInitials(fullName: string, email: string | null | undefined): string {
  const source = fullName.trim() || email || "User";

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((value) => value.charAt(0).toUpperCase())
    .join("");
}

export function applyLocalDeviceReady(
  registeredPasskeys: RegisteredPasskey[],
): RegisteredPasskey[] {
  const localCredentialId = getStoredLocalPasskey()?.credentialId;

  return registeredPasskeys.map((passkey) => ({
    ...passkey,
    localDeviceReady:
      passkey.localDeviceReady || passkey.credentialId === localCredentialId,
  }));
}
