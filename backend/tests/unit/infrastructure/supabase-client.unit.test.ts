import assert from "node:assert/strict";
import { test } from "node:test";
import { createSupabaseClients } from "../../../src/shared/infrastructure/supabase/client";

test("createSupabaseClients keeps service and publishable clients separate", () => {
  const clients = createSupabaseClients({
    supabaseUrl: "https://example.supabase.co",
    supabaseServiceKey: "service-key",
    supabasePublishableKey: "publishable-key",
  });

  assert.notEqual(clients.service, clients.publishable);
  assert.ok(clients.service.auth);
  assert.ok(clients.publishable.auth);
});
