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
   * Value: { userId, expiresAt (Unix seconds) }
   */
  private readonly memStore = new Map<string, { userId: string; expiresAt: number }>();

  constructor(
    private readonly limit: number = parseInt(process.env.SESSION_LIMIT ?? "2", 10),
    private readonly useDb: boolean = false,
  ) {}

  // ---- Public API --------------------------------------------------------

  async registerSession(userId: string, accessToken: string, expiresAt: number): Promise<void> {
    const hash = hashToken(accessToken);

    if (this.useDb) {
      const { supabase } = await import("../integrations/supabase");
      const { error } = await (supabase.from("user_sessions") as any).insert({
        user_id: userId,
        session_token_hash: hash,
        expires_at: new Date(expiresAt * 1000).toISOString(),
      });
      if (error) throw new Error(`Failed to register session: ${error.message}`);
      return;
    }

    this.memStore.set(hash, { userId, expiresAt });
  }

  async removeSession(accessToken: string): Promise<void> {
    const hash = hashToken(accessToken);

    if (this.useDb) {
      const { supabase } = await import("../integrations/supabase");
      const { error } = await (supabase.from("user_sessions") as any)
        .delete()
        .eq("session_token_hash", hash);
      if (error) throw new Error(`Failed to remove session: ${error.message}`);
      return;
    }

    this.memStore.delete(hash);
  }

  async pruneExpiredSessions(userId: string): Promise<void> {
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (this.useDb) {
      const { supabase } = await import("../integrations/supabase");
      const { error } = await (supabase.from("user_sessions") as any)
        .delete()
        .eq("user_id", userId)
        .lt("expires_at", new Date(nowSeconds * 1000).toISOString());
      if (error) throw new Error(`Failed to prune sessions: ${error.message}`);
      return;
    }

    for (const [hash, entry] of this.memStore) {
      if (entry.userId === userId && entry.expiresAt <= nowSeconds) {
        this.memStore.delete(hash);
      }
    }
  }

  async countActiveSessions(userId: string): Promise<number> {
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (this.useDb) {
      const { supabase } = await import("../integrations/supabase");
      const { count, error } = await (supabase.from("user_sessions") as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gt("expires_at", new Date(nowSeconds * 1000).toISOString());
      if (error) throw new Error(`Failed to count sessions: ${error.message}`);
      return count ?? 0;
    }

    let active = 0;
    for (const entry of this.memStore.values()) {
      if (entry.userId === userId && entry.expiresAt > nowSeconds) {
        active++;
      }
    }
    return active;
  }

  async isAtLimit(userId: string): Promise<boolean> {
    const count = await this.countActiveSessions(userId);
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
