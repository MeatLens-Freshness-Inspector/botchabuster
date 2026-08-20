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

test("pruneInactiveSessions scopes one expired-or-idle delete to the requested user", async () => {
  const originalFrom = supabase.from;
  const operations: Array<[string, unknown, unknown?]> = [];
  const builder = {
    delete() {
      operations.push(["delete", undefined]);
      return builder;
    },
    eq(column: string, value: string) {
      operations.push(["eq", column, value]);
      return builder;
    },
    or(filter: string) {
      operations.push(["or", filter]);
      return Promise.resolve({ error: null });
    },
  };

  (supabase as unknown as { from: (table: string) => unknown }).from = (table: string) => {
    assert.equal(table, "user_sessions");
    return builder;
  };

  try {
    const service = new SessionLimitService(2, true, () => Date.parse("2026-08-20T12:00:00.000Z"));
    await service.pruneInactiveSessions("user-1", 900);

    assert.deepEqual(operations, [
      ["delete", undefined],
      ["eq", "user_id", "user-1"],
      ["or", "expires_at.lte.2026-08-20T12:00:00.000Z,last_seen_at.lte.2026-08-20T11:45:00.000Z"],
    ]);
  } finally {
    (supabase as unknown as { from: typeof originalFrom }).from = originalFrom;
  }
});

test("countActiveSessions requires both absolute and idle activity windows", async () => {
  const originalFrom = supabase.from;
  const greaterThanFilters: Array<[string, string]> = [];
  const builder = {
    count: 1,
    error: null,
    select() {
      return builder;
    },
    eq() {
      return builder;
    },
    gt(column: string, value: string) {
      greaterThanFilters.push([column, value]);
      return builder;
    },
  };

  (supabase as unknown as { from: (table: string) => unknown }).from = (table: string) => {
    assert.equal(table, "user_sessions");
    return builder;
  };

  try {
    const service = new SessionLimitService(2, true, () => Date.parse("2026-08-20T12:00:00.000Z"));
    assert.equal(await service.countActiveSessions("user-1", 900), 1);
    assert.deepEqual(greaterThanFilters, [
      ["expires_at", "2026-08-20T12:00:00.000Z"],
      ["last_seen_at", "2026-08-20T11:45:00.000Z"],
    ]);
  } finally {
    (supabase as unknown as { from: typeof originalFrom }).from = originalFrom;
  }
});
