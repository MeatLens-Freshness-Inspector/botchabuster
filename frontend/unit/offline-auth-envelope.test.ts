import assert from "node:assert/strict";
import test from "node:test";
import { indexedDB as fakeIndexedDb } from "fake-indexeddb";
import {
  clearOfflineAuthEnvelope,
  getOfflineAuthEnvelopeSnapshot,
  isOfflineAuthExpired,
  loadOfflineAuthEnvelope,
  saveOfflineAuthEnvelope,
  updateOfflineAuthEnvelope,
} from "../src/lib/offlineAuthEnvelope";

const originalIndexedDb = globalThis.indexedDB;

function installIndexedDb(): () => void {
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    value: fakeIndexedDb,
  });

  return () => {
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: originalIndexedDb,
    });
  };
}

function createEnvelope() {
  return {
    user: {
      id: "user-1",
      email: "inspector@example.com",
    },
    profile: {
      id: "user-1",
      full_name: "Inspector Example",
      avatar_url: null,
      inspector_code: "INS-123",
      report_organization: "dti" as const,
      is_dark_mode: false,
      show_detailed_results: false,
      onboarding_completed_at: "2026-07-01T00:00:00.000Z",
      onboarding_version: 1,
      location: "Olongapo",
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
    },
    isAdmin: false,
    authenticatedAt: "2026-07-07T00:00:00.000Z",
    offlineExpiresAt: "2026-07-08T00:00:00.000Z",
    offlineUnlockRequired: true,
    passwordVerifier: {
      email: "inspector@example.com",
      hash: "abc123",
      algorithm: "pbkdf2-sha256" as const,
      iterations: 100_000,
    },
    localPasskey: null,
  };
}

test("stores and reloads the offline auth envelope from indexeddb", async () => {
  const restoreIndexedDb = installIndexedDb();

  try {
    await clearOfflineAuthEnvelope();
    const envelope = createEnvelope();

    await saveOfflineAuthEnvelope(envelope);

    const reloadedEnvelope = await loadOfflineAuthEnvelope();
    assert.deepEqual(reloadedEnvelope, envelope);
    assert.deepEqual(getOfflineAuthEnvelopeSnapshot(), envelope);
  } finally {
    await clearOfflineAuthEnvelope();
    restoreIndexedDb();
  }
});

test("updateOfflineAuthEnvelope mutates the stored snapshot and clear removes it", async () => {
  const restoreIndexedDb = installIndexedDb();

  try {
    await clearOfflineAuthEnvelope();
    await saveOfflineAuthEnvelope(createEnvelope());

    const updatedEnvelope = await updateOfflineAuthEnvelope((currentEnvelope) => {
      assert.ok(currentEnvelope);
      return {
        ...currentEnvelope,
        offlineUnlockRequired: false,
        isAdmin: true,
      };
    });

    assert.equal(updatedEnvelope?.offlineUnlockRequired, false);
    assert.equal(updatedEnvelope?.isAdmin, true);
    assert.equal((await loadOfflineAuthEnvelope())?.offlineUnlockRequired, false);

    await clearOfflineAuthEnvelope();
    assert.equal(await loadOfflineAuthEnvelope(), null);
    assert.equal(getOfflineAuthEnvelopeSnapshot(), null);
  } finally {
    await clearOfflineAuthEnvelope();
    restoreIndexedDb();
  }
});

test("isOfflineAuthExpired enforces the stored absolute 24-hour deadline", () => {
  const envelope = createEnvelope();

  assert.equal(isOfflineAuthExpired(envelope, Date.parse("2026-07-07T23:59:59.000Z")), false);
  assert.equal(isOfflineAuthExpired(envelope, Date.parse("2026-07-08T00:00:00.000Z")), true);
});
