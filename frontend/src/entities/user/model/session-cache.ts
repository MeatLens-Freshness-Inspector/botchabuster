import type { Profile } from "../api/profile-client";
import type { AuthSession, AuthUser } from "./session-types";

export type SessionCacheState = {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  isAdmin: boolean;
  isDeveloper: boolean;
};

export function createSessionCacheState(
  state: Partial<SessionCacheState> = {},
): SessionCacheState {
  return {
    user: state.user ?? null,
    session: state.session ?? null,
    profile: state.profile ?? null,
    isAdmin: state.isAdmin ?? false,
    isDeveloper: state.isDeveloper ?? false,
  };
}
