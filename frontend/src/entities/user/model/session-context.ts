import { createContext, useContext } from "react";
import type { Profile, ReportOrganization } from "../api/profile-client";
import type { AuthMode, AuthSession, AuthUser, ProfileStatus } from "./session-types";

export interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  isAdmin: boolean;
  isDeveloper: boolean;
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
