export const PROFILE_STATUS_VALUES = ["idle", "loading", "ready", "error"] as const;
export type ProfileStatus = (typeof PROFILE_STATUS_VALUES)[number];

export const AUTH_MODE_VALUES = [
  "anonymous",
  "bootstrapping",
  "online-authenticated",
  "offline-locked",
  "offline-authenticated",
  "expired",
] as const;
export type AuthMode = (typeof AUTH_MODE_VALUES)[number];

export type UserSessionState = {
  userId: string | null;
  profileStatus: ProfileStatus;
  authMode: AuthMode;
  isAdmin: boolean;
  isDeveloper: boolean;
  isOnlineAuthenticated: boolean;
};

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthSession {
  access_token: string | null;
  refresh_token: string | null;
  token_type: string | null;
  expires_in: number | null;
  expires_at: number | null;
}

export type AuthRole = "developer" | "admin" | "moderator" | "user";
export type AuthPrimaryRole = "developer" | "admin" | "inspector";
