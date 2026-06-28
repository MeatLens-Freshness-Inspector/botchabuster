import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authClient, type AuthSession, type AuthUser } from "@/integrations/api/AuthClient";
import { passkeyClient } from "@/integrations/api/PasskeyClient";
import { profileClient, type Profile } from "@/integrations/api/ProfileClient";
import {
  clearCachedAdmin,
  clearCachedAuth,
  clearCachedProfile,
  getCachedAdmin,
  getCachedAuthSession,
  getCachedAuthUser,
  getCachedProfile,
  setCachedAdmin,
  setCachedAuth,
  setCachedProfile,
} from "@/lib/authCache";
import {
  clearOfflineCredential,
  storeOfflineCredential,
  verifyOfflineCredential,
} from "@/lib/offlineCredentials";
import { queueAuditLog } from "@/lib/offlineAuditQueue";
import { startPasskeyAuthentication } from "@/lib/passkeys/browser";
import {
  createLocalPasskeyAuthenticationOptions,
  createLocalPasskeyChallenge,
  getStoredLocalPasskey,
  isOfflineUnlockRequired as getStoredOfflineUnlockRequired,
  setOfflineUnlockRequired as setStoredOfflineUnlockRequired,
  storeLocalPasskey,
  verifyLocalPasskeyAssertion,
} from "@/lib/passkeys/localUnlock";
import type { ReportOrganization } from "@/lib/reportOrganizations";

const AUTH_EXPIRED_EVENT = "meatlens:auth-expired";

type ProfileStatus = "idle" | "loading" | "ready" | "error";

const createAuditId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

function hasValidAccessToken(session: AuthSession | null): boolean {
  if (!session?.access_token) return false;

  if (typeof session.expires_at !== "number" || Number.isNaN(session.expires_at)) {
    return true;
  }

  const expiresAtMs = session.expires_at > 1_000_000_000_000
    ? session.expires_at
    : session.expires_at * 1000;

  return expiresAtMs > Date.now() + 30_000;
}

interface LoadUserDataOptions {
  allowCachedFallback?: boolean;
  skipRemote?: boolean;
  isAdminHint?: boolean | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  profileStatus: ProfileStatus;
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
  const [offlineUnlockRequired, setOfflineUnlockRequiredState] = useState(false);

  const syncOfflineUnlockRequired = useCallback((required: boolean) => {
    setStoredOfflineUnlockRequired(required);
    setOfflineUnlockRequiredState(required);
  }, []);

  const clearStoredAuthState = useCallback(() => {
    clearCachedAuth();
    clearCachedProfile();
    clearCachedAdmin();
    syncOfflineUnlockRequired(false);
  }, [syncOfflineUnlockRequired]);

  const clearInMemoryAuthState = useCallback(() => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setProfileStatus("idle");
  }, []);

  const applyCachedProfileState = useCallback((currentUser: AuthUser, isAdminHint?: boolean | null): boolean => {
    const cachedProfile = getCachedProfile(currentUser.id);
    if (!cachedProfile) {
      return false;
    }

    setProfile(cachedProfile);
    setIsAdmin(Boolean(isAdminHint ?? getCachedAdmin(currentUser.id) ?? false));
    setProfileStatus("ready");
    return true;
  }, []);

  const loadUserData = useCallback(async (
    currentUser: AuthUser | null,
    options: LoadUserDataOptions = {},
  ) => {
    if (!currentUser) {
      setProfile(null);
      setIsAdmin(false);
      setProfileStatus("idle");
      return;
    }

    if (options.skipRemote) {
      if (applyCachedProfileState(currentUser, options.isAdminHint)) {
        return;
      }

      setProfile(null);
      setIsAdmin(Boolean(options.isAdminHint));
      setProfileStatus("error");
      return;
    }

    setProfileStatus("loading");

    try {
      const [userProfile, admin] = await Promise.all([
        profileClient.getProfile(currentUser.id),
        profileClient.hasRole(currentUser.id, "admin"),
      ]);

      if (!userProfile) {
        throw new Error("Profile record missing");
      }

      setProfile(userProfile);
      setIsAdmin(admin);
      setProfileStatus("ready");
      setCachedProfile(userProfile);
      setCachedAdmin(currentUser.id, admin);
    } catch (err) {
      console.error("Failed to load user data:", err);

      if (options.allowCachedFallback && applyCachedProfileState(currentUser, options.isAdminHint)) {
        return;
      }

      setProfile(null);
      setIsAdmin(Boolean(options.isAdminHint));
      setProfileStatus("error");
    }
  }, [applyCachedProfileState]);

  const retryProfileLoad = useCallback(async () => {
    await loadUserData(user, {
      allowCachedFallback: !navigator.onLine,
      skipRemote: !navigator.onLine,
      isAdminHint: user ? getCachedAdmin(user.id) : null,
    });
  }, [loadUserData, user]);

  useEffect(() => {
    let mounted = true;

    const restoreAuth = async () => {
      const cachedUser = getCachedAuthUser();
      const cachedSession = getCachedAuthSession();

      if (!cachedUser) {
        clearStoredAuthState();
        if (mounted) {
          clearInMemoryAuthState();
          setIsLoading(false);
        }
        return;
      }

      try {
        if (!hasValidAccessToken(cachedSession)) {
          throw new Error("Cached auth session is missing or expired");
        }

        const lockRequired = getStoredOfflineUnlockRequired();
        if (!mounted) return;

        setOfflineUnlockRequiredState(lockRequired);
        if (lockRequired) {
          clearInMemoryAuthState();
          return;
        }

        setUser(cachedUser);
        setSession(cachedSession);
        await loadUserData(cachedUser, {
          allowCachedFallback: !navigator.onLine,
          skipRemote: !navigator.onLine,
          isAdminHint: getCachedAdmin(cachedUser.id),
        });
      } catch (err) {
        console.error("Failed to restore auth session:", err);
        clearStoredAuthState();
        if (mounted) {
          clearInMemoryAuthState();
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void restoreAuth();

    return () => {
      mounted = false;
    };
  }, [clearInMemoryAuthState, clearStoredAuthState, loadUserData, syncOfflineUnlockRequired]);

  useEffect(() => {
    const handleAuthExpired = () => {
      clearStoredAuthState();
      clearInMemoryAuthState();
      setIsLoading(false);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, [clearInMemoryAuthState, clearStoredAuthState]);

  const signIn = async (email: string, password: string): Promise<{ isAdmin: boolean }> => {
    if (!navigator.onLine) {
      const { valid, isAdmin: cachedAdmin } = await verifyOfflineCredential(email, password);
      if (!valid) {
        throw new Error(
          "Cannot sign in offline — credentials not recognised. " +
          "Please connect to the internet to sign in for the first time.",
        );
      }

      const cachedUser = getCachedAuthUser();
      const cachedSession = getCachedAuthSession();

      if (!cachedUser || !hasValidAccessToken(cachedSession)) {
        throw new Error(
          "No cached session found. Please sign in online at least once before going offline.",
        );
      }

      syncOfflineUnlockRequired(false);
      setUser(cachedUser);
      setSession(cachedSession);
      await loadUserData(cachedUser, {
        allowCachedFallback: true,
        skipRemote: true,
        isAdminHint: cachedAdmin,
      });

      try {
        await queueAuditLog({
          id: createAuditId(),
          userId: cachedUser.id,
          eventType: "auth.sign_in",
          eventTime: new Date().toISOString(),
          data: { email },
          source: { is_offline: true },
          queuedAt: new Date().toISOString(),
        });
      } catch {
        // Best-effort only; never block offline sign-in.
      }

      return { isAdmin: cachedAdmin };
    }

    const result = await authClient.signIn(email, password);
    setUser(result.user);
    setSession(result.session);
    setCachedAuth(result.user, result.session);
    syncOfflineUnlockRequired(false);
    await loadUserData(result.user);
    const admin = await profileClient.hasRole(result.user.id, "admin");
    void storeOfflineCredential(email, password, admin);
    return { isAdmin: admin };
  };

  const signInWithPasskey = async (): Promise<{ isAdmin: boolean }> => {
    if (!navigator.onLine) {
      throw new Error("Passkey sign-in requires an internet connection");
    }

    const { challengeId, options } = await passkeyClient.getAuthenticationOptions();
    const credential = await startPasskeyAuthentication(options);
    const result = await passkeyClient.verifyAuthentication({
      challengeId,
      credential,
    });

    setUser(result.user);
    setSession(result.session);
    setCachedAuth(result.user, result.session);
    syncOfflineUnlockRequired(false);
    await loadUserData(result.user);
    const admin = await profileClient.hasRole(result.user.id, "admin");
    return { isAdmin: admin };
  };

  const unlockWithLocalPasskey = async (): Promise<{ isAdmin: boolean }> => {
    if (!offlineUnlockRequired) {
      throw new Error("No cached offline session is waiting for passkey unlock");
    }

    const storedPasskey = getStoredLocalPasskey();
    if (!storedPasskey) {
      throw new Error("This device is not enrolled for local passkey unlock");
    }

    const cachedUser = getCachedAuthUser();
    const cachedSession = getCachedAuthSession();
    if (!cachedUser || !hasValidAccessToken(cachedSession)) {
      throw new Error(
        "No cached session found. Please sign in online at least once before going offline.",
      );
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

    if (verification.newCounter > storedPasskey.counter) {
      storeLocalPasskey({
        ...storedPasskey,
        counter: verification.newCounter,
      });
    }

    const cachedAdmin = storedPasskey.isAdmin || getCachedAdmin(cachedUser.id) || false;

    syncOfflineUnlockRequired(false);
    setUser(cachedUser);
    setSession(cachedSession);
    await loadUserData(cachedUser, {
      allowCachedFallback: true,
      skipRemote: !navigator.onLine,
      isAdminHint: cachedAdmin,
    });

    return { isAdmin: cachedAdmin };
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
    const currentUser = user;

    clearInMemoryAuthState();

    if (navigator.onLine) {
      try {
        await authClient.signOut();
      } catch {
        // Ignore sign-out transport failures.
      }

      clearStoredAuthState();
      clearOfflineCredential();
      return;
    }

    if (currentUser) {
      syncOfflineUnlockRequired(true);
    }

    if (!currentUser) {
      return;
    }

    try {
      await queueAuditLog({
        id: createAuditId(),
        userId: currentUser.id,
        eventType: "auth.sign_out",
        eventTime: new Date().toISOString(),
        data: { email: currentUser.email },
        source: { is_offline: true },
        queuedAt: new Date().toISOString(),
      });
    } catch {
      // Best-effort only; never block offline sign-out.
    }
  };

  const resetPassword = async (email: string) => {
    await authClient.resetPassword(email, `${window.location.origin}/reset-password`);
  };

  const updatePasswordWithRecoveryToken = async (accessToken: string, password: string) => {
    await authClient.updatePasswordWithRecoveryToken(accessToken, password);
  };

  const updateEmail = async (email: string) => {
    if (!user) throw new Error("Not signed in");
    const updatedUser = await authClient.updateEmail(user.id, email);
    setUser(updatedUser);
    setCachedAuth(updatedUser, session);
  };

  const updatePassword = async (password: string) => {
    if (!user) throw new Error("Not signed in");
    await authClient.updatePassword(user.id, password);
  };

  const setProfileState = (nextProfile: Profile | null) => {
    setProfile(nextProfile);
    setCachedProfile(nextProfile);
  };

  const canUnlockWithLocalPasskey =
    offlineUnlockRequired &&
    Boolean(getStoredLocalPasskey()) &&
    Boolean(getCachedAuthUser()) &&
    hasValidAccessToken(getCachedAuthSession());

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isLoading,
        profileStatus,
        offlineUnlockRequired,
        canUnlockWithLocalPasskey,
        retryProfileLoad,
        signIn,
        signInWithPasskey,
        unlockWithLocalPasskey,
        signUp,
        signOut,
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
