import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { authClient, type AuthSession, type AuthUser } from "@/integrations/api/AuthClient";
import { profileClient, type Profile } from "@/integrations/api/ProfileClient";
import {
  storeOfflineCredential,
  verifyOfflineCredential,
  clearOfflineCredential,
} from "@/lib/offlineCredentials";
import { queueAuditLog } from "@/lib/offlineAuditQueue";

const USER_STORAGE_KEY = "meatlens-auth-user";
const SESSION_STORAGE_KEY = "meatlens-auth-session";
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

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  profileStatus: ProfileStatus;
  retryProfileLoad: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ isAdmin: boolean }>;
  signUp: (email: string, password: string, fullName: string, accessCode: string) => Promise<void>;
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

  const loadUserData = useCallback(async (currentUser: AuthUser | null) => {
    if (!currentUser) {
      setProfile(null);
      setIsAdmin(false);
      setProfileStatus("idle");
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
    } catch (err) {
      console.error("Failed to load user data:", err);
      setProfile(null);
      setIsAdmin(false);
      setProfileStatus("error");
    }
  }, []);

  const retryProfileLoad = useCallback(async () => {
    await loadUserData(user);
  }, [loadUserData, user]);

  useEffect(() => {
    let mounted = true;

    const restoreAuth = async () => {
      const storedUserRaw = window.localStorage.getItem(USER_STORAGE_KEY);
      const storedSessionRaw = window.localStorage.getItem(SESSION_STORAGE_KEY);

      if (!storedUserRaw) {
        if (mounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setIsAdmin(false);
          setProfileStatus("idle");
          setIsLoading(false);
        }
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUserRaw) as AuthUser;
        const parsedSession = storedSessionRaw ? JSON.parse(storedSessionRaw) as AuthSession : null;

        if (!parsedUser?.id) throw new Error("Invalid cached user");
        if (!hasValidAccessToken(parsedSession)) throw new Error("Cached auth session is missing or expired");

        if (!mounted) return;

        setUser(parsedUser);
        setSession(parsedSession);
        await loadUserData(parsedUser);
      } catch (err) {
        console.error("Failed to restore auth session:", err);
        window.localStorage.removeItem(USER_STORAGE_KEY);
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        if (mounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setIsAdmin(false);
          setProfileStatus("idle");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void restoreAuth();

    return () => {
      mounted = false;
    };
  }, [loadUserData]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      setProfileStatus("idle");
      setIsLoading(false);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ isAdmin: boolean }> => {
    // ── Offline path ──────────────────────────────────────────────────────────
    if (!navigator.onLine) {
      const { valid, isAdmin: cachedAdmin } = await verifyOfflineCredential(email, password);
      if (!valid) {
        throw new Error(
          "Cannot sign in offline — credentials not recognised. " +
          "Please connect to the internet to sign in for the first time.",
        );
      }
      const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
      if (!storedUser) {
        throw new Error(
          "No cached session found. Please sign in online at least once before going offline.",
        );
      }
      const cachedUser = JSON.parse(storedUser) as AuthUser;
      const cachedSession = window.localStorage.getItem(SESSION_STORAGE_KEY)
        ? (JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY)!) as AuthSession)
        : null;
      setUser(cachedUser);
      setSession(cachedSession);
      setIsAdmin(cachedAdmin);
      // Best-effort profile restore (no network needed if React Query has it cached)
      await loadUserData(cachedUser).catch(() => {});

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

    // ── Online path ───────────────────────────────────────────────────────────
    const result = await authClient.signIn(email, password);
    setUser(result.user);
    setSession(result.session);
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(result.session));
    await loadUserData(result.user);
    const admin = await profileClient.hasRole(result.user.id, "admin");
    // Persist a hash for future offline re-authentication
    void storeOfflineCredential(email, password, admin);
    return { isAdmin: admin };
  };

  const signUp = async (email: string, password: string, fullName: string, accessCode: string) => {
    await authClient.signUp({
      email,
      password,
      fullName,
      accessCode,
      emailRedirectTo: window.location.origin,
    });
  };

  const signOut = async () => {
    const currentUser = user;
    // Always clear in-memory state immediately
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setProfileStatus("idle");

    if (navigator.onLine) {
      // Online: notify server and fully clear local storage
      try { await authClient.signOut(); } catch { /* ignore */ }
      window.localStorage.removeItem(USER_STORAGE_KEY);
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      clearOfflineCredential();
    }
    // Offline: keep localStorage so the user can re-authenticate offline.
    // The credential hash and cached session are preserved but in-memory
    // state is cleared, so the app treats the user as signed out.

    if (!navigator.onLine && currentUser) {
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
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
  };

  const updatePassword = async (password: string) => {
    if (!user) throw new Error("Not signed in");
    await authClient.updatePassword(user.id, password);
  };

  const setProfileState = (nextProfile: Profile | null) => {
    setProfile(nextProfile);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isLoading,
        profileStatus,
        retryProfileLoad,
        signIn,
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
