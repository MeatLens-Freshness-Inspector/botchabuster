import assert from "node:assert/strict";
import test from "node:test";
import "../../setup/env";

import { supabase } from "../../../src/integrations/supabase";
import { profileService } from "../../../src/modules/users/infrastructure/ProfileService";

test("role replacement preserves moderator", async () => {
  const calls: string[] = [];
  const database = supabase as unknown as { from: (table: string) => unknown };
  const originalFrom = database.from;
  let operation: "select" | "delete" | "insert" = "select";
  const builder: Record<string, (...args: any[]) => unknown> = {};
  builder.select = () => { operation = "select"; return builder; };
  builder.delete = () => { operation = "delete"; calls.push("delete"); return builder; };
  builder.eq = (_column: string, value: string) => {
    if (operation === "delete") calls.push(`user:${value}`);
    return builder;
  };
  builder.in = (_column: string, values: string[]) => {
    calls.push(`roles:${values.join(",")}`);
    return builder;
  };
  builder.insert = (row: { user_id: string; role: string }) => {
    operation = "insert";
    calls.push(`insert:${row.user_id}:${row.role}`);
    return builder;
  };
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(operation === "select"
      ? {
          data: [
            { id: "role-admin", user_id: "user-2", role: "admin" },
            { id: "role-moderator", user_id: "user-2", role: "moderator" },
          ],
          error: null,
        }
      : { data: null, error: null }).then(resolve, reject);

  database.from = ((table: string) => {
    assert.equal(table, "user_roles");
    return builder;
  }) as never;

  try {
    const result = await profileService.changeUserRoleByAdmin("user-2", "user");
    assert.deepEqual(result, { previousRole: "admin", role: "user" });
    assert.deepEqual(calls, ["delete", "user:user-2", "roles:user,admin,developer", "insert:user-2:user"]);
  } finally {
    database.from = originalFrom;
  }
});

test("managed-role lookup uses developer priority", async () => {
  const original = profileService.getUserRoles;
  profileService.getUserRoles = async () => [
    { id: "user-role", user_id: "user-2", role: "user" },
    { id: "developer-role", user_id: "user-2", role: "developer" },
  ];
  try {
    assert.equal(await profileService.getManagedRole("user-2"), "developer");
  } finally {
    profileService.getUserRoles = original;
  }
});
