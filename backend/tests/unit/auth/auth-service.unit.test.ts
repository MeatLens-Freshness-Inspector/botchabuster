import assert from "node:assert/strict";
import test from "node:test";
import "../../setup/env";
import { authService } from "../../../src/modules/auth/infrastructure/SupabaseAuthFactory";
import { supabase, supabaseAuth } from "../../../src/integrations/supabase";

test("signIn revokes the transient Supabase auth session after exchanging credentials", async () => {
  const supabaseClient = supabase as any;
  const supabaseAuthClient = supabaseAuth as any;
  const originalFrom = supabaseClient.from;
  const originalSignInWithPassword = supabaseAuthClient.auth.signInWithPassword;
  const originalFetch = globalThis.fetch;
  let fetchArgs: { input: RequestInfo | URL; init?: RequestInit } | null = null;

  supabaseClient.from = ((tableName: string) => {
    assert.equal(tableName, "profiles");
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "user-1",
              report_organization: "dti",
            },
            error: null,
          }),
        }),
      }),
    };
  }) as typeof supabase.from;

  supabaseAuthClient.auth.signInWithPassword = async () => ({
    data: {
      user: {
        id: "user-1",
        email: "inspector@example.com",
        user_metadata: {},
      },
      session: {
        access_token: "supabase-session-token",
        refresh_token: "supabase-refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: 1_900_000_000,
      },
    },
    error: null,
  });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchArgs = { input, init };
    return new Response(null, { status: 204 });
  }) as typeof globalThis.fetch;

  try {
    const result = await authService.signIn({
      email: "inspector@example.com",
      password: "secret-123",
    });

    assert.equal(result.user.id, "user-1");
    assert.equal(result.session, null);
    assert.ok(fetchArgs);
    assert.equal(String(fetchArgs.input), "https://example.supabase.co/auth/v1/logout");
    assert.equal(fetchArgs.init?.method, "POST");

    const headers = new Headers(fetchArgs.init?.headers);
    assert.equal(headers.get("authorization"), "Bearer supabase-session-token");
    assert.equal(headers.get("apikey"), "publishable-key");
  } finally {
    supabaseClient.from = originalFrom;
    supabaseAuthClient.auth.signInWithPassword = originalSignInWithPassword;
    globalThis.fetch = originalFetch;
  }
});
