import React, { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  authClient,
  type AuthBootstrapPayload,
  type AuthPrimaryRole,
  type AuthRole,
  type AuthSession,
  type AuthUser,
} from "@/features/auth/api";
import { passkeyClient } from "@/features/passkeys/api";
import { profileClient, type Profile, type ReportOrganization } from "@/entities/user/api";
import {
  AUTH_EXPIRED_EVENT,
  clearApiCsrfToken,
  getApiCsrfToken,
  setApiCsrfToken,
  setApiSessionRefreshHandler,
} from "@/shared/api/request";
import { getHttpApiErrorStatus } from "@/shared/api";
import {
  clearCachedAdmin,
  clearCachedAuth,
  clearCachedProfile,
  setCachedAuth,
} from "@/entities/user/model/session-cache-storage";
import {
  clearLegacyOfflineCredential,
  createPasswordVerifier,
  readLegacyOfflineCredential,
  verifyPasswordVerifier,
} from "@/entities/user/model/offline-credentials";
import { queueAuditLog } from "@/features/offline-sync";
import {
  clearOfflineAuthEnvelope,
  isOfflineAuthExpired,
  loadOfflineAuthEnvelope,
  saveOfflineAuthEnvelope,
  updateOfflineAuthEnvelope,
  type OfflineAuthEnvelope,
} from "@/entities/user/model/offline-auth-envelope";
import { startPasskeyAuthentication } from "@/features/passkeys/lib/browser";
import {
  createLocalPasskeyAuthenticationOptions,
  createLocalPasskeyChallenge,
  verifyLocalPasskeyAssertion,
} from "@/features/passkeys/lib/local-unlock";
import {
  clearLegacyOfflineUnlockRequired,
  clearLegacyStoredLocalPasskey,
  getLegacyOfflineUnlockRequired,
  getLegacyStoredLocalPasskey,
  getStoredLocalPasskey,
} from "@/features/passkeys";
import type { AuthMode, ProfileStatus } from "@/entities/user";
import {
  createAnonymousSessionState,
  createOfflineAuthenticatedSessionState,
  createOfflineLockedSessionState,
  createOnlineAuthenticatedSessionState,
  createSessionCacheState,
  restoreSession,
  type SessionStoreState,
} from "@/entities/user";
import { AuthContext } from "@/entities/user/model/session-context";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialSessionCache = createSessionCacheState();
  const [user, setUser] = useState<AuthUser | null>(initialSessionCache.user);
  const [session, setSession] = useState<AuthSession | null>(initialSessionCache.session);
  const [profile, setProfile] = useState<Profile | null>(initialSessionCache.profile);
  const [isAdmin, setIsAdmin] = useState(initialSessionCache.isAdmin);
  const [isDeveloper, setIsDeveloper] = useState(initialSessionCache.isDeveloper);
  const [isLoading, setIsLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [authMode, setAuthMode] = useState<AuthMode>("bootstrapping");
  const [offlineUnlockRequired, setOfflineUnlockRequiredState] = useState(false);
  const mountedRef = useRef(true);

  const applySessionState = useCallback((nextState: SessionStoreState) => {
    setUser(nextState.user);
    setSession(nextState.session);
    setProfile(nextState.profile);
    setIsAdmin(nextState.isAdmin);
    setIsDeveloper(nextState.isDeveloper);
    setProfileStatus(nextState.profileStatus);
    setOfflineUnlockRequiredState(nextState.offlineUnlockRequired);
    setAuthMode(nextState.authMode);
  }, []);

  const clearLegacyAuthArtifacts = useCallback(() => {
    clearLegacyOfflineCredential();
    clearLegacyStoredLocalPasskey();
    clearLegacyOfflineUnlockRequired();
  }, []);

  const clearLegacyLiveAuthArtifacts = useCallback(() => {
    clearCachedProfile();
    clearCachedAdmin();
  }, []);

  const clearInMemoryAuthState = useCallback((nextMode: AuthMode) => {
    clearApiCsrfToken();
    clearCachedAuth();
    clearCachedProfile();
    clearCachedAdmin();
    applySessionState(createAnonymousSessionState(nextMode));
  }, [applySessionState]);

  const applyOfflineAuthenticatedState = useCallback((envelope: OfflineAuthEnvelope) => {
    clearApiCsrfToken();
    applySessionState(createOfflineAuthenticatedSessionState(envelope));
  }, [applySessionState]);

  const applyOnlineAuthenticatedState = useCallback((payload: AuthBootstrapPayload) => {
    setApiCsrfToken(payload.csrfToken);
    setCachedAuth(payload.user, payload.session);
    applySessionState(createOnlineAuthenticatedSessionState(payload));
  }, [applySessionState]);

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
    applySessionState(createOfflineLockedSessionState());

    const nextEnvelope = await updateOfflineAuthEnvelope((currentEnvelope) => {
      const baseEnvelope = currentEnvelope ?? envelope;
      return {
        ...baseEnvelope,
        offlineUnlockRequired: true,
      };
    });

    return nextEnvelope ?? optimisticEnvelope;
  }, [applySessionState]);

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
      roles: payload.roles,
      primaryRole: payload.primaryRole,
      isAdmin: payload.isAdmin,
      isDeveloper: payload.isDeveloper,
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
        setIsDeveloper(envelope.isDeveloper);
        setProfileStatus("ready");
        return;
      }

      setProfileStatus("error");
      return;
    }

    setProfileStatus("loading");

    try {
      const [nextProfile, hasAdminRole, hasDeveloperRole] = await Promise.all([
        profileClient.getProfile(user.id),
        profileClient.hasRole(user.id, "admin"),
        profileClient.hasRole(user.id, "developer"),
      ]);

      if (!nextProfile) {
        throw new Error("Profile record missing");
      }

      const nextIsAdmin = hasDeveloperRole || hasAdminRole;
      const nextIsDeveloper = hasDeveloperRole;
      const nextPrimaryRole: AuthPrimaryRole = nextIsDeveloper ? "developer" : nextIsAdmin ? "admin" : "inspector";
      const nextRoles = [
        nextIsDeveloper ? "developer" : null,
        hasAdminRole ? "admin" : null,
      ].filter(Boolean) as AuthRole[];

      setProfile(nextProfile);
      setIsAdmin(nextIsAdmin);
      setIsDeveloper(nextIsDeveloper);
      setProfileStatus("ready");

      await updateOfflineAuthEnvelope((currentEnvelope) => {
        if (!currentEnvelope || currentEnvelope.user.id !== user.id) {
          return currentEnvelope;
        }

        return {
          ...currentEnvelope,
          profile: nextProfile,
          roles: nextRoles,
          primaryRole: nextPrimaryRole,
          isAdmin: nextIsAdmin,
          isDeveloper: nextIsDeveloper,
        };
      });
    } catch (error) {
      console.error("Failed to refresh profile:", error);
      setProfileStatus("error");
    }
  }, [authMode, loadValidOfflineEnvelope, user]);

  useEffect(() => {
    setApiSessionRefreshHandler(async () => {
      const payload = await authClient.getSession();
      setApiCsrfToken(payload.csrfToken);
      return payload.csrfToken;
    });

    return () => {
      setApiSessionRefreshHandler(null);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const restoreAuth = async () => {
      setIsLoading(true);
      setAuthMode("bootstrapping");
      await restoreSession({
        isOnline: () => navigator.onLine,
        clearLegacyLiveAuthArtifacts,
        loadValidOfflineEnvelope,
        lockToOfflineEnvelope,
        clearInMemoryAuthState,
        getSession: () => authClient.getSession(),
        applyOnlineBootstrap,
        reportBootstrapError: (error) => console.error("Failed to bootstrap online session:", error),
      });

      if (mountedRef.current) {
        setIsLoading(false);
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

    if (!navigator.onLine) {
      throw new Error("Sign out requires an internet connection.");
    }

    try {
      await authClient.signOut(csrfToken);
    } catch (error) {
      const status = getHttpApiErrorStatus(error);
      if (status !== 401 && status !== 404) {
        throw error;
      }
    }

    clearInMemoryAuthState("anonymous");
    await clearOfflineAuthEnvelope();
    clearLegacyAuthArtifacts();
  };

  const lock = async () => {
    if (navigator.onLine && authMode === "online-authenticated") {
      await signOut();
      return;
    }

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

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error("Not signed in");
    if (authMode !== "online-authenticated") {
      throw new Error("Reconnect and sign in online before updating your password.");
    }

    await authClient.updatePassword(user.id, currentPassword, newPassword);
    const passwordVerifier = user.email
      ? await createPasswordVerifier(user.email, newPassword)
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
        isDeveloper,
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

export { useAuth } from "@/entities/user/model/session-context";
