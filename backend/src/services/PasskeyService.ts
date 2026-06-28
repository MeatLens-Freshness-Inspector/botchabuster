import crypto from "crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from "@simplewebauthn/server";
import { supabase } from "../integrations/supabase";
import { type AppSession } from "./AppSessionService";
import { authService, type AuthUser } from "./AuthService";
import { passkeyCeremonyStore, type PasskeyCeremonyType } from "./PasskeyCeremonyStore";

interface PasskeyRow {
  credential_id: string;
  user_id: string;
  public_key: string;
  counter: number;
  transports: string[] | null;
  device_label: string;
  credential_device_type: string | null;
  credential_backed_up: boolean | null;
  created_at: string;
  last_used_at: string | null;
}

export interface RegisteredPasskey {
  credentialId: string;
  deviceLabel: string;
  transports: string[];
  createdAt: string;
  lastUsedAt: string | null;
  localDeviceReady: boolean;
}

function normalizeTransports(
  transports: string[] | null | undefined,
): AuthenticatorTransportFuture[] | undefined {
  if (!transports || transports.length === 0) {
    return undefined;
  }

  return transports as AuthenticatorTransportFuture[];
}

function normalizeDeviceLabel(deviceLabel: string | undefined): string {
  const trimmed = deviceLabel?.trim();
  if (!trimmed) {
    return "Current device";
  }
  return trimmed.slice(0, 80);
}

function createChallengeId(): string {
  return crypto.randomUUID();
}

export class PasskeyService {
  private readonly rpName = process.env.WEBAUTHN_RP_NAME || "MeatLens";

  async beginRegistration(user: AuthUser, origin: string): Promise<{
    challengeId: string;
    options: Awaited<ReturnType<typeof generateRegistrationOptions>>;
  }> {
    const rpId = this.extractRpId(origin);
    const existingPasskeys = await this.listPasskeyRows(user.id);
    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: rpId,
      userName: user.email || user.id,
      userDisplayName: user.email || user.id,
      userID: Buffer.from(user.id, "utf8"),
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
        authenticatorAttachment: "platform",
      },
      supportedAlgorithmIDs: [-7],
      excludeCredentials: existingPasskeys.map((passkey) => ({
        id: passkey.credential_id,
        transports: normalizeTransports(passkey.transports),
      })),
      preferredAuthenticatorType: "localDevice",
    });

    const challengeId = createChallengeId();
    passkeyCeremonyStore.save(challengeId, {
      challenge: options.challenge,
      type: "registration",
      origin,
      rpId,
      userId: user.id,
    });

    return { challengeId, options };
  }

  async verifyRegistration(input: {
    user: AuthUser;
    challengeId: string;
    origin: string;
    response: RegistrationResponseJSON;
    deviceLabel?: string;
  }): Promise<RegisteredPasskey> {
    const ceremony = this.consumeCeremony(input.challengeId, "registration");

    if (ceremony.userId !== input.user.id) {
      throw new Error("Passkey registration did not match the signed-in user");
    }

    if (ceremony.origin !== input.origin) {
      throw new Error("Passkey registration origin mismatch");
    }

    const verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: ceremony.challenge,
      expectedOrigin: ceremony.origin,
      expectedRPID: ceremony.rpId,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Passkey registration could not be verified");
    }

    const { credential } = verification.registrationInfo;
    const row: PasskeyRow = {
      credential_id: credential.id,
      user_id: input.user.id,
      public_key: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: (input.response.response.transports ?? []) as string[],
      device_label: normalizeDeviceLabel(input.deviceLabel),
      credential_device_type: verification.registrationInfo.credentialDeviceType,
      credential_backed_up: verification.registrationInfo.credentialBackedUp,
      created_at: new Date().toISOString(),
      last_used_at: null,
    };

    const { error } = await (supabase.from("passkey_credentials") as any).upsert(row, {
      onConflict: "credential_id",
    });

    if (error) {
      throw new Error(`Failed to store passkey: ${error.message}`);
    }

    return this.mapRegisteredPasskey(row, true);
  }

  async beginAuthentication(origin: string): Promise<{
    challengeId: string;
    options: Awaited<ReturnType<typeof generateAuthenticationOptions>>;
  }> {
    const rpId = this.extractRpId(origin);
    const options = await generateAuthenticationOptions({
      rpID: rpId,
      userVerification: "required",
    });

    const challengeId = createChallengeId();
    passkeyCeremonyStore.save(challengeId, {
      challenge: options.challenge,
      type: "authentication",
      origin,
      rpId,
    });

    return { challengeId, options };
  }

  async verifyAuthentication(input: {
    challengeId: string;
    origin: string;
    response: AuthenticationResponseJSON;
  }): Promise<{ user: AuthUser; session: AppSession }> {
    const ceremony = this.consumeCeremony(input.challengeId, "authentication");

    if (ceremony.origin !== input.origin) {
      throw new Error("Passkey sign-in origin mismatch");
    }

    const storedPasskey = await this.getPasskeyRow(input.response.id);
    if (!storedPasskey) {
      throw new Error("Passkey is not registered");
    }

    const verification = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: ceremony.challenge,
      expectedOrigin: ceremony.origin,
      expectedRPID: ceremony.rpId,
      credential: this.toWebAuthnCredential(storedPasskey),
      requireUserVerification: true,
    });

    if (!verification.verified) {
      throw new Error("Passkey sign-in could not be verified");
    }

    const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(storedPasskey.user_id);
    if (authUserError || !authUser.user) {
      throw new Error(`Failed to load passkey user: ${authUserError?.message || "User not found"}`);
    }

    const updatedCounter = verification.authenticationInfo.newCounter;
    const lastUsedAt = new Date().toISOString();
    const { error: updateError } = await (supabase.from("passkey_credentials") as any)
      .update({
        counter: updatedCounter,
        credential_device_type: verification.authenticationInfo.credentialDeviceType,
        credential_backed_up: verification.authenticationInfo.credentialBackedUp,
        last_used_at: lastUsedAt,
      })
      .eq("credential_id", storedPasskey.credential_id);

    if (updateError) {
      throw new Error(`Failed to update passkey metadata: ${updateError.message}`);
    }

    const user: AuthUser = {
      id: authUser.user.id,
      email: authUser.user.email ?? null,
    };

    return {
      user,
      session: authService.createAppSession(user),
    };
  }

  async listPasskeys(userId: string): Promise<RegisteredPasskey[]> {
    const passkeys = await this.listPasskeyRows(userId);
    return passkeys.map((passkey) => this.mapRegisteredPasskey(passkey, false));
  }

  async deletePasskey(userId: string, credentialId: string): Promise<void> {
    const { error } = await (supabase.from("passkey_credentials") as any)
      .delete()
      .eq("user_id", userId)
      .eq("credential_id", credentialId);

    if (error) {
      throw new Error(`Failed to remove passkey: ${error.message}`);
    }
  }

  private consumeCeremony(challengeId: string, expectedType: PasskeyCeremonyType) {
    const ceremony = passkeyCeremonyStore.consume(challengeId);
    if (!ceremony || ceremony.type !== expectedType) {
      throw new Error("Passkey ceremony is missing or expired");
    }

    return ceremony;
  }

  private extractRpId(origin: string): string {
    return new URL(origin).hostname;
  }

  private async listPasskeyRows(userId: string): Promise<PasskeyRow[]> {
    const { data, error } = await (supabase.from("passkey_credentials") as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load passkeys: ${error.message}`);
    }

    return (data ?? []) as PasskeyRow[];
  }

  private async getPasskeyRow(credentialId: string): Promise<PasskeyRow | null> {
    const { data, error } = await (supabase.from("passkey_credentials") as any)
      .select("*")
      .eq("credential_id", credentialId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load passkey: ${error.message}`);
    }

    return (data as PasskeyRow | null) ?? null;
  }

  private toWebAuthnCredential(passkey: PasskeyRow): WebAuthnCredential {
    return {
      id: passkey.credential_id,
      publicKey: Uint8Array.from(Buffer.from(passkey.public_key, "base64url")),
      counter: passkey.counter,
      transports: normalizeTransports(passkey.transports),
    };
  }

  private mapRegisteredPasskey(passkey: PasskeyRow, localDeviceReady: boolean): RegisteredPasskey {
    return {
      credentialId: passkey.credential_id,
      deviceLabel: passkey.device_label,
      transports: passkey.transports ?? [],
      createdAt: passkey.created_at,
      lastUsedAt: passkey.last_used_at,
      localDeviceReady,
    };
  }
}

export const passkeyService = new PasskeyService();
