import type {
  NativeBiometricRecordInput,
} from "../model/native-biometric-types";
import {
  assertNativeAuthRecord,
  serializeNativeAuthRecord,
  type NativeAuthRecord,
} from "../model/native-auth-record";
import { createNativeBiometricError, normalizeNativeBiometricError } from "../model/native-biometric-errors";

export interface NativeAuthVaultDependencies {
  authenticate: (reason: "enroll" | "login" | "unlock") => Promise<void>;
  readRecord: () => Promise<string>;
  writeRecord: (record: string) => Promise<void>;
  clearRecord: () => Promise<void>;
}

export interface NativeAuthVault {
  enroll(input: NativeBiometricRecordInput): Promise<void>;
  unlock(reason: "login" | "unlock"): Promise<NativeAuthRecord>;
}

function createRecord(input: NativeBiometricRecordInput): NativeAuthRecord {
  const record: NativeAuthRecord = {
    version: 1,
    userId: input.userId,
    session: input.session,
    offlineEnvelope: input.offlineEnvelope,
    authenticatedAt: input.offlineEnvelope.authenticatedAt,
    expiresAt: input.offlineEnvelope.offlineExpiresAt,
  };
  assertNativeAuthRecord(record);
  return record;
}

export function createNativeAuthVault(
  dependencies: NativeAuthVaultDependencies,
): NativeAuthVault {
  return {
    async enroll(input) {
      if (input.offlineEnvelope.user.id !== input.userId) {
        throw new Error("Native biometric enrollment user does not match offline envelope");
      }

      const record = createRecord(input);
      await dependencies.authenticate("enroll");
      await dependencies.writeRecord(serializeNativeAuthRecord(record));
    },
    async unlock(reason) {
      await dependencies.authenticate(reason);
      let serialized: string;
      try {
        serialized = await dependencies.readRecord();
      } catch (error) {
        throw normalizeNativeBiometricError(error);
      }

      try {
        const parsed = JSON.parse(serialized) as unknown;
        assertNativeAuthRecord(parsed);
        return parsed;
      } catch (error) {
        if (error instanceof Error && "code" in error) {
          throw error;
        }
        throw createNativeBiometricError("vault-corrupt", "Native biometric record is invalid.", true);
      }
    },
  };
}
