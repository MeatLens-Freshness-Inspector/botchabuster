import assert from "node:assert/strict";
import test from "node:test";
import {
  createAnonymousSessionState,
  createOfflineAuthenticatedSessionState,
  createOfflineLockedSessionState,
  createOnlineAuthenticatedSessionState,
} from "../../../../src/entities/user/model/session-store";
import { restoreSession } from "../../../../src/entities/user/model/restore-session";

const envelope = {
  user: { id: "user-1", email: "inspector@example.com" },
  profile: { id: "profile-1", user_id: "user-1", full_name: "Inspector" },
  roles: ["admin" as const],
  primaryRole: "admin" as const,
  isAdmin: true,
  isDeveloper: false,
  authenticatedAt: "2026-08-11T00:00:00.000Z",
  offlineExpiresAt: "2026-08-12T00:00:00.000Z",
  offlineUnlockRequired: false,
  passwordVerifier: null,
  localPasskey: null,
};

test("session store maps online and offline authentication states", () => {
  const online = createOnlineAuthenticatedSessionState({
    user: envelope.user,
    profile: envelope.profile,
    session: { access_token: "token", refresh_token: "refresh" },
    isAdmin: true,
    isDeveloper: false,
  });

  assert.equal(online.authMode, "online-authenticated");
  assert.equal(online.isOnlineAuthenticated, true);
  assert.equal(online.user?.id, "user-1");
  assert.equal(createOfflineAuthenticatedSessionState(envelope).authMode, "offline-authenticated");
  assert.equal(createOfflineLockedSessionState().authMode, "offline-locked");
  assert.equal(createAnonymousSessionState("expired").authMode, "expired");
});

test("restoreSession locks a valid envelope while offline", async () => {
  const actions: string[] = [];

  await restoreSession({
    isOnline: () => false,
    clearLegacyLiveAuthArtifacts: () => actions.push("clear-live"),
    loadValidOfflineEnvelope: async () => envelope,
    lockToOfflineEnvelope: async () => {
      actions.push("lock");
    },
    clearInMemoryAuthState: (mode) => actions.push(mode),
    getSession: async () => {
      throw new Error("should not request a session while offline");
    },
    applyOnlineBootstrap: async () => {
      throw new Error("should not apply an online session while offline");
    },
  });

  assert.deepEqual(actions, ["clear-live", "lock"]);
});
