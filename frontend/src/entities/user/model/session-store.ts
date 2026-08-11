import type { Profile } from "../api/profile-client";
import type { OfflineAuthEnvelope } from "./offline-auth-envelope";
import type { AuthMode, AuthSession, AuthUser, ProfileStatus } from "./session-types";

export interface SessionStoreState {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  isAdmin: boolean;
  isDeveloper: boolean;
  profileStatus: ProfileStatus;
  authMode: AuthMode;
  offlineUnlockRequired: boolean;
  isOnlineAuthenticated: boolean;
}

export interface OnlineSessionStateInput {
  user: AuthUser;
  profile: Profile;
  session: AuthSession;
  isAdmin: boolean;
  isDeveloper: boolean;
}

export function createOnlineAuthenticatedSessionState(
  input: OnlineSessionStateInput,
): SessionStoreState {
  return {
    user: input.user,
    session: input.session,
    profile: input.profile,
    isAdmin: input.isAdmin,
    isDeveloper: input.isDeveloper,
    profileStatus: "ready",
    authMode: "online-authenticated",
    offlineUnlockRequired: false,
    isOnlineAuthenticated: true,
  };
}

export function createOfflineAuthenticatedSessionState(
  envelope: OfflineAuthEnvelope,
): SessionStoreState {
  return {
    user: envelope.user,
    session: null,
    profile: envelope.profile,
    isAdmin: envelope.isAdmin,
    isDeveloper: envelope.isDeveloper,
    profileStatus: "ready",
    authMode: "offline-authenticated",
    offlineUnlockRequired: false,
    isOnlineAuthenticated: false,
  };
}

export function createOfflineLockedSessionState(): SessionStoreState {
  return {
    user: null,
    session: null,
    profile: null,
    isAdmin: false,
    isDeveloper: false,
    profileStatus: "idle",
    authMode: "offline-locked",
    offlineUnlockRequired: true,
    isOnlineAuthenticated: false,
  };
}

export function createAnonymousSessionState(
  mode: Extract<AuthMode, "anonymous" | "expired"> = "anonymous",
): SessionStoreState {
  return {
    user: null,
    session: null,
    profile: null,
    isAdmin: false,
    isDeveloper: false,
    profileStatus: "idle",
    authMode: mode,
    offlineUnlockRequired: false,
    isOnlineAuthenticated: false,
  };
}
