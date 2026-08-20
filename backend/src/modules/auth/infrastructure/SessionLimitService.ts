import crypto from "crypto";

/**
 * Hashes an access token with SHA-256 so we never store raw tokens in the DB.
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Tracks active sessions per user and enforces a configurable device limit.
 *
 * In unit tests, construct with `useDb = false` (the default) to use the
 * in-memory store — no Supabase credentials required.
 *
 * In production, use `getSessionLimitService()` which returns a DB-backed
 * singleton (`useDb = true`).
 */
export class SessionLimitService {
  /**
   * In-memory store for unit-testing without a real DB.
   * Key: SHA-256 hash of the access token.
   * Value: { userId, expiresAt, lastSeenAt (Unix seconds) }
   */
  private readonly memStore = new Map<string, {
    userId: string;
    expiresAt: number;
    lastSeenAt: number;
  }>();

  constructor(
    private readonly limit: number = parseInt(process.env.SESSION_LIMIT ?? "2", 10),
    private readonly useDb: boolean = false,
    private readonly nowMs: () => number = () => Date.now(),
  ) { }

  private nowSeconds(): number {
    return Math.floor(this.nowMs() / 1000);
  }

  // ---- Public API --------------------------------------------------------

  async registerSession(userId: string, accessToken: string, expiresAt: number): Promise<void> {
    const hash = hashToken(accessToken);
    const nowSeconds = this.nowSeconds();

    if (this.useDb) {
      const { supabase } = await import("../../../integrations/supabase");
      const { error } = await (supabase.from("user_sessions") as any).upsert({
        user_id: userId,
        session_token_hash: hash,
        expires_at: new Date(expiresAt * 1000).toISOString(),
        last_seen_at: new Date(nowSeconds * 1000).toISOString(),
      }, {
        onConflict: "session_token_hash",
      });
      if (error) throw new Error(`Failed to register session: ${error.message}`);
      return;
    }

    this.memStore.set(hash, { userId, expiresAt, lastSeenAt: nowSeconds });
  }

  async removeSession(accessToken: string): Promise<void> {
    const hash = hashToken(accessToken);

    if (this.useDb) {
      const { supabase } = await import("../../../integrations/supabase");
      const { error } = await (supabase.from("user_sessions") as any)
        .delete()
        .eq("session_token_hash", hash);
      if (error) throw new Error(`Failed to remove session: ${error.message}`);
      return;
    }

    this.memStore.delete(hash);
  }

  async hasSession(accessToken: string): Promise<boolean> {
    const hash = hashToken(accessToken);
    const nowSeconds = this.nowSeconds();

    if (this.useDb) {
      const { supabase } = await import("../../../integrations/supabase");
      const { data, error } = await (supabase.from("user_sessions") as any)
        .select("id")
        .eq("session_token_hash", hash)
        .gt("expires_at", new Date(nowSeconds * 1000).toISOString())
        .maybeSingle();
      if (error) throw new Error(`Failed to check session: ${error.message}`);
      return Boolean(data?.id);
    }

    const entry = this.memStore.get(hash);
    return Boolean(entry && entry.expiresAt > nowSeconds);
  }

  async touchSession(accessToken: string, idleTimeoutSeconds: number): Promise<boolean> {
    const hash = hashToken(accessToken);
    const nowSeconds = this.nowSeconds();
    const nowIso = new Date(nowSeconds * 1000).toISOString();
    const idleCutoffIso = new Date((nowSeconds - idleTimeoutSeconds) * 1000).toISOString();

    if (this.useDb) {
      const { supabase } = await import("../../../integrations/supabase");
      const { data, error } = await (supabase.from("user_sessions") as any)
        .update({ last_seen_at: nowIso })
        .eq("session_token_hash", hash)
        .gt("expires_at", nowIso)
        .gt("last_seen_at", idleCutoffIso)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(`Failed to touch session: ${error.message}`);
      return Boolean(data?.id);
    }

    const entry = this.memStore.get(hash);
    if (!entry || entry.expiresAt <= nowSeconds || entry.lastSeenAt <= nowSeconds - idleTimeoutSeconds) {
      this.memStore.delete(hash);
      return false;
    }

    entry.lastSeenAt = nowSeconds;
    return true;
  }

  async removeInactiveSessions(idleTimeoutSeconds: number): Promise<number> {
    const nowSeconds = this.nowSeconds();
    const nowIso = new Date(nowSeconds * 1000).toISOString();
    const idleCutoffIso = new Date((nowSeconds - idleTimeoutSeconds) * 1000).toISOString();

    if (this.useDb) {
      const { supabase } = await import("../../../integrations/supabase");
      const { count, error } = await (supabase.from("user_sessions") as any)
        .delete({ count: "exact" })
        .or(`expires_at.lte.${nowIso},last_seen_at.lte.${idleCutoffIso}`);
      if (error) throw new Error(`Failed to remove inactive sessions: ${error.message}`);

      return count ?? 0;
    }

    let removed = 0;
    for (const [hash, entry] of this.memStore) {
      if (entry.expiresAt <= nowSeconds || entry.lastSeenAt <= nowSeconds - idleTimeoutSeconds) {
        this.memStore.delete(hash);
        removed += 1;
      }
    }

    return removed;
  }

  async pruneInactiveSessions(userId: string, idleTimeoutSeconds: number): Promise<void> {
    const nowSeconds = this.nowSeconds();
    const nowIso = new Date(nowSeconds * 1000).toISOString();
    const idleCutoffIso = new Date((nowSeconds - idleTimeoutSeconds) * 1000).toISOString();

    if (this.useDb) {
      const { supabase } = await import("../../../integrations/supabase");
      const { error } = await (supabase.from("user_sessions") as any)
        .delete()
        .eq("user_id", userId)
        .or(`expires_at.lte.${nowIso},last_seen_at.lte.${idleCutoffIso}`);
      if (error) throw new Error(`Failed to prune sessions: ${error.message}`);
      return;
    }

    for (const [hash, entry] of this.memStore) {
      if (
        entry.userId === userId &&
        (entry.expiresAt <= nowSeconds || entry.lastSeenAt <= nowSeconds - idleTimeoutSeconds)
      ) {
        this.memStore.delete(hash);
      }
    }
  }

  async countActiveSessions(userId: string, idleTimeoutSeconds: number): Promise<number> {
    const nowSeconds = this.nowSeconds();
    const nowIso = new Date(nowSeconds * 1000).toISOString();
    const idleCutoffIso = new Date((nowSeconds - idleTimeoutSeconds) * 1000).toISOString();

    if (this.useDb) {
      const { supabase } = await import("../../../integrations/supabase");
      const { count, error } = await (supabase.from("user_sessions") as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gt("expires_at", nowIso)
        .gt("last_seen_at", idleCutoffIso);
      if (error) throw new Error(`Failed to count sessions: ${error.message}`);
      return count ?? 0;
    }

    let active = 0;
    for (const entry of this.memStore.values()) {
      if (
        entry.userId === userId &&
        entry.expiresAt > nowSeconds &&
        entry.lastSeenAt > nowSeconds - idleTimeoutSeconds
      ) {
        active++;
      }
    }
    return active;
  }

  async isAtLimit(userId: string, idleTimeoutSeconds: number): Promise<boolean> {
    const count = await this.countActiveSessions(userId, idleTimeoutSeconds);
    return count >= this.limit;
  }
}

// ---- Production singleton (DB-backed) ------------------------------------

let sessionLimitService: SessionLimitService | null = null;

export function getSessionLimitService(): SessionLimitService {
  if (sessionLimitService) return sessionLimitService;
  const limit = parseInt(process.env.SESSION_LIMIT ?? "2", 10);
  sessionLimitService = new SessionLimitService(limit, true /* useDb */);
  return sessionLimitService;
}
