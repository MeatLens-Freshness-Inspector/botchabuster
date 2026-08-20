import assert from "node:assert/strict";
import { test } from "node:test";
import "../../setup/env";
import { supabase } from "../../../src/integrations/supabase";
import { SessionLimitService } from "../../../src/modules/auth/infrastructure/SessionLimitService";

test("removeInactiveSessions performs one counted delete with an expired-or-idle predicate", async () => {
  const originalFrom = supabase.from;
  let deleteCalls = 0;
  const deleteOptions: unknown[] = [];
  const orFilters: string[] = [];

  const createBuilder = () => {
    const builder = {
      delete(options?: unknown) {
        deleteCalls += 1;
        deleteOptions.push(options);
        return builder;
      },
      lte() {
        return builder;
      },
      gt() {
        return builder;
      },
      select() {
        return Promise.resolve({ data: [{ id: "one" }, { id: "two" }], count: null, error: null });
      },
      or(filter: string) {
        orFilters.push(filter);
        return Promise.resolve({ data: null, count: 7, error: null });
      },
    };
    return builder;
  };

  (supabase as unknown as { from: (table: string) => unknown }).from = (table: string) => {
    assert.equal(table, "user_sessions");
    return createBuilder();
  };

  try {
    const service = new SessionLimitService(2, true, () => Date.parse("2026-08-20T12:00:00.000Z"));
    const removed = await service.removeInactiveSessions(900);

    assert.equal(deleteCalls, 1);
    assert.deepEqual(deleteOptions, [{ count: "exact" }]);
    assert.deepEqual(orFilters, [
      "expires_at.lte.2026-08-20T12:00:00.000Z,last_seen_at.lte.2026-08-20T11:45:00.000Z",
    ]);
    assert.equal(removed, 7);
  } finally {
    (supabase as unknown as { from: typeof originalFrom }).from = originalFrom;
  }
});
