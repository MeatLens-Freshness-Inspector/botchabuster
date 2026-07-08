import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  authClient,
  type AuthBootstrapPayload,
  type AuthSession,
  type AuthUser,
} from "@/integrations/api/AuthClient";
import { passkeyClient } from "@/integrations/api/PasskeyClient";
import { profileClient, type Profile } from "@/integrations/api/ProfileClient";
import {
  AUTH_EXPIRED_EVENT,
  clearApiCsrfToken,
  getApiCsrfToken,
  setApiCsrfToken,
} from "@/integrations/api/apiRequest";
import {
  clearCachedAdmin,
  clearCachedAuth,
  clearCachedProfile,
} from "@/lib/authCache";
import {
  clearLegacyOfflineCredential,
  createPasswordVerifier,
  readLegacyOfflineCredential,
  verifyPasswordVerifier,
} from "@/lib/offlineCredentials";
import { queueAuditLog } from "@/lib/offlineAuditQueue";
import {
  clearOfflineAuthEnvelope,
  isOfflineAuthExpired,
  loadOfflineAuthEnvelope,
  saveOfflineAuthEnvelope,
  updateOfflineAuthEnvelope,
  type OfflineAuthEnvelope,
} from "@/lib/offlineAuthEnvelope";
import { startPasskeyAuthentication } from "@/lib/passkeys/browser";
import {
  clearLegacyOfflineUnlockRequired,
  clearLegacyStoredLocalPasskey,
  createLocalPasskeyAuthenticationOptions,
  createLocalPasskeyChallenge,
  getLegacyOfflineUnlockRequired,
  getLegacyStoredLocalPasskey,
  getStoredLocalPasskey,
  verifyLocalPasskeyAssertion,
} from "@/lib/passkeys/localUnlock";
import type { ReportOrganization } from "@/lib/reportOrganizations";

type ProfileStatus = "idle" | "loading" | "ready" | "error";
type AuthMode =
  | "anonymous"
  | "bootstrapping"
  | "online-authenticated"
  | "offline-locked"
  | "offline-authenticated"
  | "expired";

const createAuditId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

function shouldRetainEnvelopeForUser(
  envelope: OfflineAuthEnvelope | null,
  user: AuthUser,
): boolean {
  return Boolean(envelope && envelope.user.id === user.id);
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  profileStatus: ProfileStatus;
  authMode: AuthMode;
  isOnlineAuthenticated: boolean;
  offlineUnlockRequired: boolean;
  canUnlockWithLocalPasskey: boolean;
  retryProfileLoad: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ isAdmin: boolean }>;
  signInWithPasskey: () => Promise<{ isAdmin: boolean }>;
  unlockWithLocalPasskey: () => Promise<{ isAdmin: boolean }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    accessCode: string,
    reportOrganization: ReportOrganization,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  lock: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePasswordWithRecoveryToken: (accessToken: string, password: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  setProfileState: (nextProfile: Profile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [authMode, setAuthMode] = useState<AuthMode>("bootstrapping");
  const [offlineUnlockRequired, setOfflineUnlockRequiredState] = useState(false);
  const mountedRef = useRef(true);

  const clearLegacyAuthArtifacts = useCallback(() => {
    clearCachedAuth();
    clearCachedProfile();
    clearCachedAdmin();
    clearLegacyOfflineCredential();
    clearLegacyStoredLocalPasskey();
    clearLegacyOfflineUnlockRequired();
  }, []);

  const clearLegacyLiveAuthArtifacts = useCallback(() => {
    clearCachedAuth();
    clearCachedProfile();
    clearCachedAdmin();
  }, []);

  const clearInMemoryAuthState = useCallback((nextMode: AuthMode) => {
    clearApiCsrfToken();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setProfileStatus("idle");
    setOfflineUnlockRequiredState(false);
    setAuthMode(nextMode);
  }, []);

  const applyOfflineAuthenticatedState = useCallback((envelope: OfflineAuthEnvelope) => {
    clearApiCsrfToken();
    setUser(envelope.user);
    setSession(null);
    setProfile(envelope.profile);
    setIsAdmin(envelope.isAdmin);
    setProfileStatus("ready");
    setOfflineUnlockRequiredState(false);
    setAuthMode("offline-authenticated");
  }, []);

  const applyOnlineAuthenticatedState = useCallback((payload: AuthBootstrapPayload) => {
    setApiCsrfToken(payload.csrfToken);
    setUser(payload.user);
    setSession(null);
    setProfile(payload.profile);
    setIsAdmin(payload.isAdmin);
    setProfileStatus("ready");
    setOfflineUnlockRequiredState(false);
    setAuthMode("online-authenticated");
  }, []);

  const loadValidOfflineEnvelope = useCallback(async (): Promise<OfflineAuthEnvelope | null> => {
    const envelope = await loadOfflineAuthEnvelope();
    if (!envelope) {
      return null;
    }

    if (!envelope.user?.id || !envelope.profile?.id || !envelope.authenticatedAt || !envelope.offlineExpiresAt) {
      await clearOfflineAuthEnvelope();
      return null;
    }

    if (isOfflineAuthExpired(envelope)) {
      await clearOfflineAuthEnvelope();
      return null;
    }

    return envelope;
  }, []);

  const lockToOfflineEnvelope = useCallback(async (
    envelope: OfflineAuthEnvelope,
  ): Promise<OfflineAuthEnvelope> => {
    const optimisticEnvelope: OfflineAuthEnvelope = {
      ...envelope,
      offlineUnlockRequired: true,
    };

    clearApiCsrfToken();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setProfileStatus("idle");
    setOfflineUnlockRequiredState(true);
    setAuthMode("offline-locked");

    const nextEnvelope = await updateOfflineAuthEnvelope((currentEnvelope) => {
      const baseEnvelope = currentEnvelope ?? envelope;
      return {
        ...baseEnvelope,
        offlineUnlockRequired: true,
      };
    });

    return nextEnvelope ?? optimisticEnvelope;
  }, []);

  const unlockFromOfflineEnvelope = useCallback(async (
    envelope: OfflineAuthEnvelope,
  ): Promise<OfflineAuthEnvelope> => {
    const optimisticEnvelope: OfflineAuthEnvelope = {
      ...envelope,
      offlineUnlockRequired: false,
    };
    applyOfflineAuthenticatedState(optimisticEnvelope);

    const nextEnvelope = await updateOfflineAuthEnvelope((currentEnvelope) => {
      const baseEnvelope = currentEnvelope ?? envelope;
      return {
        ...baseEnvelope,
        offlineUnlockRequired: false,
      };
    });

    return nextEnvelope ?? optimisticEnvelope;
  }, [applyOfflineAuthenticatedState]);

  const applyOnlineBootstrap = useCallback(async (
    payload: AuthBootstrapPayload,
    passwordVerifierOverride: OfflineAuthEnvelope["passwordVerifier"] = undefined,
  ): Promise<OfflineAuthEnvelope> => {
    const currentEnvelope = await loadOfflineAuthEnvelope();
    const sameUserEnvelope = shouldRetainEnvelopeForUser(currentEnvelope, payload.user)
      ? currentEnvelope
      : null;
    const legacyVerifier = readLegacyOfflineCredential();
    const nextEnvelope: OfflineAuthEnvelope = {
      user: payload.user,
      profile: payload.profile,
      isAdmin: payload.isAdmin,
      authenticatedAt: payload.authenticatedAt,
      offlineExpiresAt: payload.offlineExpiresAt,
      offlineUnlockRequired: false,
      passwordVerifier:
        passwordVerifierOverride !== undefined
          ? passwordVerifierOverride
          : sameUserEnvelope?.passwordVerifier ??
            (legacyVerifier && payload.user.email &&
            legacyVerifier.email === payload.user.email.trim().toLowerCase()
              ? legacyVerifier
              : null),
      localPasskey:
        sameUserEnvelope?.localPasskey ??
        getLegacyStoredLocalPasskey(),
    };

    applyOnlineAuthenticatedState(payload);
    await saveOfflineAuthEnvelope(nextEnvelope);
    clearLegacyAuthArtifacts();
    return nextEnvelope;
  }, [applyOnlineAuthenticatedState, clearLegacyAuthArtifacts]);

  const retryProfileLoad = useCallback(async () => {
    if (!user) {
      return;
    }

    if (!navigator.onLine || authMode !== "online-authenticated") {
      const envelope = await loadValidOfflineEnvelope();
      if (envelope?.user.id === user.id) {
        setProfile(envelope.profile);
        setIsAdmin(envelope.isAdmin);
        setProfileStatus("ready");
        return;
      }

      setProfileStatus("error");
      return;
    }

    setProfileStatus("loading");

    try {
      const [nextProfile, nextIsAdmin] = await Promise.all([
        profileClient.getProfile(user.id),
        profileClient.hasRole(user.id, "admin"),
      ]);

      if (!nextProfile) {
        throw new Error("Profile record missing");
      }

      setProfile(nextProfile);
      setIsAdmin(nextIsAdmin);
      setProfileStatus("ready");

      await updateOfflineAuthEnvelope((currentEnvelope) => {
        if (!currentEnvelope || currentEnvelope.user.id !== user.id) {
          return currentEnvelope;
        }

        return {
          ...currentEnvelope,
          profile: nextProfile,
          isAdmin: nextIsAdmin,
        };
      });
    } catch (error) {
      console.error("Failed to refresh profile:", error);
      setProfileStatus("error");
    }
  }, [authMode, loadValidOfflineEnvelope, user]);

  useEffect(() => {
    mountedRef.current = true;

    const restoreAuth = async () => {
      setIsLoading(true);
      setAuthMode("bootstrapping");
      clearLegacyLiveAuthArtifacts();

      const validEnvelope = await loadValidOfflineEnvelope();

      if (!navigator.onLine) {
        if (validEnvelope) {
          await lockToOfflineEnvelope(validEnvelope);
        } else {
          clearInMemoryAuthState("anonymous");
        }

        if (mountedRef.current) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const payload = await authClient.getSession();
        await applyOnlineBootstrap(payload);
      } catch (error) {
        if (validEnvelope) {
          await lockToOfflineEnvelope(validEnvelope);
        } else {
          console.error("Failed to bootstrap online session:", error);
          clearInMemoryAuthState("expired");
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    void restoreAuth();

    return () => {
      mountedRef.current = false;
    };
  }, [applyOnlineBootstrap, clearInMemoryAuthState, clearLegacyLiveAuthArtifacts, loadValidOfflineEnvelope, lockToOfflineEnvelope]);

  useEffect(() => {
    const handleAuthExpired = () => {
      void (async () => {
        const validEnvelope = await loadValidOfflineEnvelope();

        if (validEnvelope) {
          await lockToOfflineEnvelope(validEnvelope);
        } else {
          clearInMemoryAuthState("expired");
        }

        if (mountedRef.current) {
          setIsLoading(false);
        }
      })();
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, [clearInMemoryAuthState, loadValidOfflineEnvelope, lockToOfflineEnvelope]);

  useEffect(() => {
    const handleOnline = () => {
      if (authMode === "online-authenticated" || authMode === "anonymous") {
        return;
      }

      void (async () => {
        try {
          const payload = await authClient.getSession();
          await applyOnlineBootstrap(payload);
        } catch {
          // Stay in the nearest safe local state until a live session is confirmed.
        }
      })();
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [applyOnlineBootstrap, authMode]);

  const signIn = async (email: string, password: string): Promise<{ isAdmin: boolean }> => {
    if (!navigator.onLine) {
      const envelope = await loadValidOfflineEnvelope();
      if (!envelope) {
        throw new Error("Offline re-login has expired. Please connect to the internet and sign in again.");
      }

      if (!envelope.passwordVerifier) {
        throw new Error("Offline password unlock is not available on this device.");
      }

      const valid = await verifyPasswordVerifier(envelope.passwordVerifier, email, password);
      if (!valid) {
        throw new Error("Cannot sign in offline with those credentials.");
      }

      const unlockedEnvelope = await unlockFromOfflineEnvelope(envelope);

      try {
        await queueAuditLog({
          id: createAuditId(),
          userId: unlockedEnvelope.user.id,
          eventType: "auth.sign_in",
          eventTime: new Date().toISOString(),
          data: { email },
          source: { is_offline: true },
          queuedAt: new Date().toISOString(),
        });
      } catch {
        // Best-effort only.
      }

      return { isAdmin: unlockedEnvelope.isAdmin };
    }

    const payload = await authClient.signIn(email, password);
    const verifier = await createPasswordVerifier(email, password);
    await applyOnlineBootstrap(payload, verifier);
    return { isAdmin: payload.isAdmin };
  };

  const signInWithPasskey = async (): Promise<{ isAdmin: boolean }> => {
    if (!navigator.onLine) {
      throw new Error("Passkey sign-in requires an internet connection");
    }

    const { challengeId, options } = await passkeyClient.getAuthenticationOptions();
    const credential = await startPasskeyAuthentication(options);
    const payload = await passkeyClient.verifyAuthentication({
      challengeId,
      credential,
    });

    await applyOnlineBootstrap(payload);
    return { isAdmin: payload.isAdmin };
  };

  const unlockWithLocalPasskey = async (): Promise<{ isAdmin: boolean }> => {
    const envelope = await loadValidOfflineEnvelope();
    if (!envelope || !envelope.offlineUnlockRequired) {
      throw new Error("No cached offline session is waiting for passkey unlock");
    }

    const storedPasskey = getStoredLocalPasskey();
    if (!storedPasskey) {
      throw new Error("This device is not enrolled for local passkey unlock");
    }

    const challenge = createLocalPasskeyChallenge();
    const credential = await startPasskeyAuthentication(
      createLocalPasskeyAuthenticationOptions(storedPasskey, challenge),
    );
    const verification = await verifyLocalPasskeyAssertion({
      storedCredential: storedPasskey,
      credential,
      expectedChallenge: challenge,
      expectedOrigin: window.location.origin,
    });

    if (!verification.verified) {
      throw new Error("Local passkey verification failed");
    }

    let nextEnvelope = envelope;
    if (verification.newCounter > storedPasskey.counter) {
      nextEnvelope = {
        ...envelope,
        localPasskey: {
          ...storedPasskey,
          counter: verification.newCounter,
        },
      };
      await saveOfflineAuthEnvelope(nextEnvelope);
    }

    const unlockedEnvelope = await unlockFromOfflineEnvelope(nextEnvelope);
    return { isAdmin: unlockedEnvelope.isAdmin };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    accessCode: string,
    reportOrganization: ReportOrganization,
  ) => {
    await authClient.signUp({
      email,
      password,
      fullName,
      accessCode,
      reportOrganization,
      emailRedirectTo: window.location.origin,
    });
  };

  const signOut = async () => {
    const csrfToken = getApiCsrfToken();

    clearInMemoryAuthState("anonymous");
    await clearOfflineAuthEnvelope();
    clearLegacyAuthArtifacts();

    if (!navigator.onLine) {
      return;
    }

    try {
      await authClient.signOut(csrfToken);
    } catch {
      // Best-effort cookie clearing only.
    }
  };

  const lock = async () => {
    const envelope = await loadValidOfflineEnvelope();
    if (!envelope) {
      clearInMemoryAuthState("anonymous");
      return;
    }

    await lockToOfflineEnvelope(envelope);
  };

  const resetPassword = async (email: string) => {
    await authClient.resetPassword(email, `${window.location.origin}/reset-password`);
  };

  const updatePasswordWithRecoveryToken = async (accessToken: string, password: string) => {
    await authClient.updatePasswordWithRecoveryToken(accessToken, password);
  };

  const updateEmail = async (email: string) => {
    if (!user) throw new Error("Not signed in");
    if (authMode !== "online-authenticated") {
      throw new Error("Reconnect and sign in online before updating your email.");
    }

    const updatedUser = await authClient.updateEmail(user.id, email);
    setUser(updatedUser);

    await updateOfflineAuthEnvelope((currentEnvelope) => {
      if (!currentEnvelope || currentEnvelope.user.id !== user.id) {
        return currentEnvelope;
      }

      return {
        ...currentEnvelope,
        user: updatedUser,
        passwordVerifier: null,
      };
    });
  };

  const updatePassword = async (password: string) => {
    if (!user) throw new Error("Not signed in");
    if (authMode !== "online-authenticated") {
      throw new Error("Reconnect and sign in online before updating your password.");
    }

    await authClient.updatePassword(user.id, password);
    const passwordVerifier = user.email
      ? await createPasswordVerifier(user.email, password)
      : null;

    await updateOfflineAuthEnvelope((currentEnvelope) => {
      if (!currentEnvelope || currentEnvelope.user.id !== user.id) {
        return currentEnvelope;
      }

      return {
        ...currentEnvelope,
        passwordVerifier,
      };
    });
  };

  const setProfileState = (nextProfile: Profile | null) => {
    setProfile(nextProfile);
    setProfileStatus(nextProfile ? "ready" : "idle");

    if (!user) {
      return;
    }

    void updateOfflineAuthEnvelope((currentEnvelope) => {
      if (!currentEnvelope || currentEnvelope.user.id !== user.id || !nextProfile) {
        return currentEnvelope;
      }

      return {
        ...currentEnvelope,
        profile: nextProfile,
      };
    });
  };

  const canUnlockWithLocalPasskey =
    offlineUnlockRequired &&
    Boolean(getStoredLocalPasskey());

  const isOnlineAuthenticated = authMode === "online-authenticated";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isLoading,
        profileStatus,
        authMode,
        isOnlineAuthenticated,
        offlineUnlockRequired,
        canUnlockWithLocalPasskey,
        retryProfileLoad,
        signIn,
        signInWithPasskey,
        unlockWithLocalPasskey,
        signUp,
        signOut,
        lock,
        resetPassword,
        updatePasswordWithRecoveryToken,
        updateEmail,
        updatePassword,
        setProfileState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
