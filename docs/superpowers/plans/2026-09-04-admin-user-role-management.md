# Admin User Role Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let developers change a managed userÃ¢â‚¬â„¢s existing role between `user`, `admin`, and `developer` from the admin Users editor, with developer-password confirmation and an encrypted admin audit event.

**Architecture:** Add a dedicated `PUT /api/profiles/admin/users/:id/role` operation. Existing `requireDeveloper` protects the route; the application use case verifies the authenticated developerÃ¢â‚¬â„¢s password through the existing `AuthGateway`, changes only managed role rows, and writes the existing encrypted audit log. The frontend keeps profile editing separate from role mutation and exposes the selector only to developers.

**Tech Stack:** Express, TypeScript, Supabase Auth/Postgres, React, Vite, NodeÃ¢â‚¬â„¢s built-in test runner via `tsx`, Playwright, ESLint, and TypeScript project references.

## Global Constraints

- Use the existing `user_roles` table and `app_role` enum; add no role values or role tables.
- Expose only `user`, `admin`, and `developer` in the selector.
- Preserve an unrelated existing `moderator` role while replacing managed `user`/`admin`/`developer` rows.
- Only developers may mutate roles; ordinary admins may continue editing profile details.
- Require the authenticated developerÃ¢â‚¬â„¢s personal password for every role change.
- Never store or include the developer password in audit payloads, database rows, responses, or error messages.
- Record successful changes as encrypted `admin.user.role_change` events containing actor, target, previous role, new role, IP, and user agent.
- Preserve all existing tests and unrelated worktree changes.

## File map

- Create `backend/src/modules/users/application/ChangeAdminUserRole.ts` for application types, password verification, role-change orchestration, and audit construction.
- Modify `backend/src/modules/users/infrastructure/ProfileService.ts` for managed-role lookup/replacement and admin-profile role data.
- Modify `backend/src/modules/users/presentation/controllers/ProfileController.ts` and `routes.ts` for the dedicated endpoint.
- Modify `backend/src/modules/users/index.ts` for public exports.
- Create `backend/tests/unit/users/change-admin-user-role.unit.test.ts`, `backend/tests/unit/users/profile-role-service.unit.test.ts`, and `backend/tests/integration/admin/user-role-route.integration.test.ts`.
- Modify `frontend/src/entities/user/api/profile-client.ts` and its index for the API contract.
- Modify `frontend/src/widgets/admin-dashboard/model/types.ts`, `use-admin-dashboard.ts`, `use-user-actions.ts`, and `ui/users/user-table.tsx`.
- Create `frontend/tests/unit/widgets/admin-dashboard/user-role-state.unit.test.ts`.
- Modify `frontend/tests/support/fixtures/app.ts` and `frontend/tests/e2e/journeys/administrator/admin-dashboard.e2e.spec.ts`.
- No Supabase migration is required because the requested roles and `user_roles` already exist.

---

### Task 1: Add the role-change application boundary

**Files:**
- Create: `backend/src/modules/users/application/ChangeAdminUserRole.ts`
- Modify: `backend/src/modules/users/index.ts`
- Test: `backend/tests/unit/users/change-admin-user-role.unit.test.ts`

**Interfaces:**
- Consumes: existing `AuthGateway.signIn(email, password)`, a role service method `changeUserRoleByAdmin(userId, role)`, and an audit writer method `write(event)`.
- Produces: `ManagedRole`, `AdminUserRoleChange`, `isManagedRole`, and `ChangeAdminUserRole.execute(input)`.

- [ ] **Step 1: Write the failing tests**

Use small in-memory fakes. Prove password verification runs before mutation, the actor email/password are passed to the existing gateway, the audit payload has previous/new roles, and serializing the audit payload does not contain the password.

```
test("developer password gates role mutation and audit", async () => {
  const calls: string[] = [];
  let auditPayload: Record<string, unknown> | undefined;
  const useCase = new ChangeAdminUserRole(
    {
      changeUserRoleByAdmin: async (userId, role) => {
        calls.push(userId + ":" + role);
        return { previousRole: "user", role };
      },
    },
    {
      signIn: async (email, password) => {
        assert.equal(email, "developer@example.com");
        assert.equal(password, "developer-password");
        calls.push("verified");
        return { id: "developer-1", email };
      },
    },
    { write: async ({ payload }) => { auditPayload = payload; } },
  );

  const result = await useCase.execute({
    targetUserId: "user-2",
    role: "admin",
    password: "developer-password",
    actor: { id: "developer-1", email: "developer@example.com", role: "developer" },
    source: { ip: "127.0.0.1", userAgent: "test-agent" },
  });

  assert.deepEqual(result, { previousRole: "user", role: "admin" });
  assert.deepEqual(calls, ["verified", "user-2:admin"]);
  assert.equal((auditPayload?.data as Record<string, unknown>).previous_role, "user");
  assert.equal((auditPayload?.data as Record<string, unknown>).new_role, "admin");
  assert.equal(JSON.stringify(auditPayload).includes("developer-password"), false);
});

test("incorrect developer password prevents role mutation and audit", async () => {
  let mutationCalled = false;
  let auditCalled = false;
  const useCase = new ChangeAdminUserRole(
    { changeUserRoleByAdmin: async () => {
      mutationCalled = true;
      return { previousRole: "user", role: "admin" };
    } },
    { signIn: async () => { throw new Error("Sign in failed"); } },
    { write: async () => { auditCalled = true; } },
  );

  await assert.rejects(
    () => useCase.execute({
      targetUserId: "user-2",
      role: "admin",
      password: "wrong-password",
      actor: { id: "developer-1", email: "developer@example.com", role: "developer" },
      source: { ip: null, userAgent: null },
    }),
    /developer password is incorrect/i,
  );
  assert.equal(mutationCalled, false);
  assert.equal(auditCalled, false);
});

test("only user admin and developer are accepted", async () => {
  const useCase = new ChangeAdminUserRole(
    { changeUserRoleByAdmin: async () => ({ previousRole: null, role: "user" }) },
    { signIn: async () => ({ id: "developer-1", email: "developer@example.com" }) },
    { write: async () => undefined },
  );

  await assert.rejects(
    () => useCase.execute({
      targetUserId: "user-2",
      role: "moderator" as never,
      password: "developer-password",
      actor: { id: "developer-1", email: "developer@example.com", role: "developer" },
      source: { ip: null, userAgent: null },
    }),
    /role must be one of: user, admin, developer/i,
  );
});
```

- [ ] **Step 2: Run the test and verify the expected red failure**

Run `npx tsx --test backend/tests/unit/users/change-admin-user-role.unit.test.ts`. Expected: FAIL because the new use case does not exist.

- [ ] **Step 3: Implement the minimal use case**

Define `MANAGED_ROLES = ["user", "admin", "developer"] as const`, `ManagedRole`, `AdminUserRoleChange = { previousRole: ManagedRole | null; role: ManagedRole }`, and `isManagedRole(value)`. In `execute`, reject blank IDs, invalid roles, blank passwords, and missing actor email; call `passwordVerifier.signIn(actor.email, password)`; convert any verifier failure or mismatched returned user ID to `Developer password is incorrect`; call the role service; then call the audit writer with:

```
{
  event_type: "admin.user.role_change",
  event_time: new Date().toISOString(),
  actor: { id: input.actor.id, role: "developer" },
  source: { ip: input.source.ip, user_agent: input.source.userAgent },
  data: {
    user_id: input.targetUserId,
    previous_role: change.previousRole,
    new_role: change.role,
  },
}
```

Export the application class, types, constants, and guard from `backend/src/modules/users/index.ts`. Never pass `password` to the audit writer.

- [ ] **Step 4: Run the focused test and verify green**

Run `npx tsx --test backend/tests/unit/users/change-admin-user-role.unit.test.ts`. Expected: all new tests PASS.

- [ ] **Step 5: Commit**

`git add backend/src/modules/users/application/ChangeAdminUserRole.ts backend/src/modules/users/index.ts backend/tests/unit/users/change-admin-user-role.unit.test.ts`

`git commit -m "feat: add audited admin role change use case"`

### Task 2: Implement existing-role persistence and current-role data

**Files:**
- Modify: `backend/src/modules/users/infrastructure/ProfileService.ts`
- Test: `backend/tests/unit/users/profile-role-service.unit.test.ts`

**Interfaces:**
- Consumes: `ManagedRole` and `AdminUserRoleChange` from Task 1.
- Produces: `ProfileService.getManagedRole(userId)`, `ProfileService.changeUserRoleByAdmin(userId, role)`, and `AdminProfile.role`.

- [ ] **Step 1: Write the failing persistence tests**

Stub the Supabase `user_roles` query builder and assert a target with `admin` plus `moderator` returns previous role `admin`, deletes only `user`/`admin`/`developer`, inserts the selected role, and leaves `moderator` untouched. Also test that `getManagedRole` chooses `developer` over `admin` over `user`.

```
import assert from "node:assert/strict";
import test from "node:test";
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
    if (operation === "delete") calls.push("user:" + value);
    return builder;
  };
  builder.in = (_column: string, values: string[]) => {
    calls.push("roles:" + values.join(","));
    return builder;
  };
  builder.insert = (row: { user_id: string; role: string }) => {
    operation = "insert";
    calls.push("insert:" + row.user_id + ":" + row.role);
    return builder;
  };
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(operation === "select"
      ? { data: [
          { id: "role-admin", user_id: "user-2", role: "admin" },
          { id: "role-moderator", user_id: "user-2", role: "moderator" },
        ], error: null }
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
```

- [ ] **Step 2: Run the test and verify red**

Run `npx tsx --test backend/tests/unit/users/profile-role-service.unit.test.ts`. Expected: FAIL because the managed-role methods do not exist.

- [ ] **Step 3: Implement the profile service changes**

Add `role: ManagedRole | null` to `AdminProfile`, a helper that selects `developer`, then `admin`, then `user`, and the following role mutation. Check both Supabase errors before returning:

```
async changeUserRoleByAdmin(userId: string, role: ManagedRole): Promise<AdminUserRoleChange> {
  const currentRoles = await this.getUserRoles(userId);
  const previousRole = resolveManagedRole(currentRoles);

  const { error: deleteError } = await (supabase.from("user_roles") as any)
    .delete()
    .eq("user_id", userId)
    .in("role", MANAGED_ROLES);
  if (deleteError) throw new Error("Failed to replace user role: " + deleteError.message);

  const { error: insertError } = await (supabase.from("user_roles") as any)
    .insert({ user_id: userId, role });
  if (insertError) throw new Error("Failed to assign user role: " + insertError.message);

  return { previousRole, role };
}
```

Use `getManagedRole` in `getAllProfiles`, `createUserByAdmin`, and `updateUserByAdmin` so admin profile responses consistently include the current role. Query roles in one bounded `in("user_id", profileIds)` request for the list; do not introduce an N+1 query. Keep `getProfile` compatible with self-service callers.

- [ ] **Step 4: Run focused persistence checks**

Run `npx tsx --test backend/tests/unit/users/profile-role-service.unit.test.ts` and `npm run typecheck -w backend`. Expected: tests PASS and typecheck exits 0.

- [ ] **Step 5: Commit**

`git add backend/src/modules/users/infrastructure/ProfileService.ts backend/tests/unit/users/profile-role-service.unit.test.ts`

`git commit -m "feat: expose and replace managed user roles"`

### Task 3: Register the developer-protected HTTP endpoint

**Files:**
- Modify: `backend/src/modules/users/presentation/controllers/ProfileController.ts`
- Modify: `backend/src/modules/users/presentation/routes.ts`
- Test: `backend/tests/integration/admin/user-role-route.integration.test.ts`

**Interfaces:**
- Consumes: `ChangeAdminUserRole`, existing `AuthOperationsGateway(authOperations)`, `getRequestAuthContext`, and existing `requireDeveloper`.
- Produces: `PUT /api/profiles/admin/users/:id/role` returning `{ user_id, previous_role, role }`.

- [ ] **Step 1: Write failing HTTP tests**

Use the repositoryÃ¢â‚¬â„¢s real route registration and `startTestServer`. Stub auth to return an ordinary admin and assert `403` with `Developer access required`; assert the role service is not called. Add a developer request test that stubs password verification, role replacement, and audit write and expects status 200 plus the documented response.

```
import assert from "node:assert/strict";
import test from "node:test";
import "../../setup/env";
import { startTestServer } from "../../support/appFactory";
import { authService } from "../../../src/modules/auth/infrastructure/SupabaseAuthFactory";
import { auditLogService } from "../../../src/modules/audit/infrastructure/AuditLogService";
import { profileService } from "../../../src/modules/users/infrastructure/ProfileService";

test("ordinary admins cannot call the role-change endpoint", async () => {
  const originalGetUser = authService.getUserByAccessToken.bind(authService);
  const originalGetRoles = profileService.getUserRoles.bind(profileService);
  let mutationCalled = false;
  const originalMutation = profileService.changeUserRoleByAdmin.bind(profileService);
  authService.getUserByAccessToken = async () => ({ id: "admin-1", email: "admin@example.com" });
  profileService.getUserRoles = async () => [{ id: "role-1", user_id: "admin-1", role: "admin" }];
  profileService.changeUserRoleByAdmin = async () => {
    mutationCalled = true;
    return { previousRole: "user", role: "developer" };
  };
  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(baseUrl + "/api/profiles/admin/users/user-2/role", {
      method: "PUT",
      headers: { Authorization: "Bearer admin-token", "Content-Type": "application/json" },
      body: JSON.stringify({ role: "developer", password: "developer-password" }),
    });
    const body = await response.json() as { error?: string };
    assert.equal(response.status, 403);
    assert.match(body.error ?? "", /developer access required/i);
    assert.equal(mutationCalled, false);
  } finally {
    authService.getUserByAccessToken = originalGetUser;
    profileService.getUserRoles = originalGetRoles;
    profileService.changeUserRoleByAdmin = originalMutation;
    await close();
  }
});

test("developers receive the audited role-change result", async () => {
  const originalGetUser = authService.getUserByAccessToken.bind(authService);
  const originalGetRoles = profileService.getUserRoles.bind(profileService);
  const originalSignIn = authService.signIn.bind(authService);
  const originalMutation = profileService.changeUserRoleByAdmin.bind(profileService);
  const originalAuditWrite = auditLogService.write.bind(auditLogService);
  let receivedPassword = "";
  let auditCalled = false;
  authService.getUserByAccessToken = async () => ({ id: "developer-1", email: "developer@example.com" });
  profileService.getUserRoles = async () => [{ id: "role-1", user_id: "developer-1", role: "developer" }];
  authService.signIn = async (input) => {
    receivedPassword = input.password;
    return { user: { id: "developer-1", email: input.email }, session: null };
  };
  profileService.changeUserRoleByAdmin = async (userId, role) => {
    assert.equal(userId, "user-2");
    assert.equal(role, "admin");
    return { previousRole: "user", role: "admin" };
  };
  auditLogService.write = async () => { auditCalled = true; };
  const { baseUrl, close } = await startTestServer();

  try {
    const response = await fetch(baseUrl + "/api/profiles/admin/users/user-2/role", {
      method: "PUT",
      headers: { Authorization: "Bearer developer-token", "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin", password: "developer-password" }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      user_id: "user-2",
      previous_role: "user",
      role: "admin",
    });
    assert.equal(receivedPassword, "developer-password");
    assert.equal(auditCalled, true);
  } finally {
    authService.getUserByAccessToken = originalGetUser;
    profileService.getUserRoles = originalGetRoles;
    authService.signIn = originalSignIn;
    profileService.changeUserRoleByAdmin = originalMutation;
    auditLogService.write = originalAuditWrite;
    await close();
  }
});
```

- [ ] **Step 2: Run red**

Run `npx tsx --test backend/tests/integration/admin/user-role-route.integration.test.ts`. Expected: FAIL because the route is not registered.

- [ ] **Step 3: Implement controller and route**

Add this route before any generic route that could match it:

```
router.put(
  "/admin/users/:id/role",
  requireDeveloper,
  (req, res) => controller.changeUserRoleByDeveloper(req, res),
);
```

Construct the use case with `profileService`, `new AuthOperationsGateway(authOperations)`, and `auditLogService`. The controller must parse only `id`, `role`, and `password`; return 400 for missing/invalid values; read actor ID/email/primary role from `getRequestAuthContext(req)`; pass IP and user agent; return the documented response; map the exact password error to 401 and validation errors to 400. Do not log `req.body`.

- [ ] **Step 4: Run backend feature lanes**

Run `npx tsx --test backend/tests/unit/users/change-admin-user-role.unit.test.ts backend/tests/unit/users/profile-role-service.unit.test.ts`, `npx tsx --test backend/tests/integration/admin/user-role-route.integration.test.ts`, and `npm run test:architecture -w backend`. Expected: all PASS.

- [ ] **Step 5: Commit**

`git add backend/src/modules/users/presentation/controllers/ProfileController.ts backend/src/modules/users/presentation/routes.ts backend/tests/integration/admin/user-role-route.integration.test.ts`

`git commit -m "feat: expose developer-only user role endpoint"`

### Task 4: Connect frontend API, state, and edit UI

**Files:**
- Modify: `frontend/src/entities/user/api/profile-client.ts`
- Modify: `frontend/src/entities/user/api/index.ts`
- Modify: `frontend/src/widgets/admin-dashboard/model/types.ts`
- Modify: `frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts`
- Modify: `frontend/src/widgets/admin-dashboard/model/use-user-actions.ts`
- Modify: `frontend/src/widgets/admin-dashboard/ui/users/user-table.tsx`
- Create: `frontend/tests/unit/widgets/admin-dashboard/user-role-state.unit.test.ts`

**Interfaces:**
- Consumes: the Task 3 response and `useAuth().isDeveloper` via the dashboard model.
- Produces: `ProfileClient.changeUserRoleByAdmin(userId, role, password)`, `ManagedRole`, and developer-only controls.

- [ ] **Step 1: Write the failing pure state tests**

Export and test a pure helper before wiring React state:

```
test("role changes require a trimmed developer password", () => {
  assert.deepEqual(
    buildRoleChangeRequest({
      isDeveloper: true,
      currentRole: "user",
      nextRole: "admin",
      password: " secret ",
    }),
    { role: "admin", password: "secret" },
  );
  assert.throws(
    () => buildRoleChangeRequest({
      isDeveloper: true,
      currentRole: "user",
      nextRole: "admin",
      password: "",
    }),
    /developer password is required/i,
  );
});

test("unchanged and non-developer edits do not call role mutation", () => {
  assert.equal(buildRoleChangeRequest({
    isDeveloper: true, currentRole: "admin", nextRole: "admin", password: "",
  }), null);
  assert.equal(buildRoleChangeRequest({
    isDeveloper: false, currentRole: "user", nextRole: "admin", password: "secret",
  }), null);
});
```

- [ ] **Step 2: Run red**

Run `npx tsx --test frontend/tests/unit/widgets/admin-dashboard/user-role-state.unit.test.ts`. Expected: FAIL because the helper is missing.

- [ ] **Step 3: Add API and form contracts**

In `profile-client.ts`, define `MANAGED_USER_ROLES = ["user", "admin", "developer"] as const`, `ManagedRole`, `AdminUserRoleChange = { user_id: string; previous_role: ManagedRole | null; role: ManagedRole }`, and optional `Profile.role`. Add `changeUserRoleByAdmin` using `PUT /profiles/admin/users/:id/role`, JSON body `{ role, password }`, the existing auth headers, and `readApiError`. Export the types from the API index. Add:

```
export type ManagedUserEditForm = ManagedUserForm & {
  role: ManagedRole;
  rolePassword: string;
};
```

Keep the create form unchanged so new users continue receiving the existing default `user` role.

- [ ] **Step 4: Implement the frontend behavior**

Implement this helper:

```
export function buildRoleChangeRequest(input: {
  isDeveloper: boolean;
  currentRole: ManagedRole;
  nextRole: ManagedRole;
  password: string;
}): { role: ManagedRole; password: string } | null {
  if (!input.isDeveloper || input.currentRole === input.nextRole) return null;
  const password = input.password.trim();
  if (!password) throw new Error("Developer password is required");
  return { role: input.nextRole, password };
}
```

Pass `isDeveloper` from `useAdminDashboard` to `useUserActions`. Initialize edit role from `profile.role ?? "user"`; initialize/clear `rolePassword`; call the role client only when the helper returns a request; send the existing profile payload without role/password; merge the role response into the local row; keep the dialog open on failure; clear the confirmation password after success.

In `user-table.tsx`, show the role badge, render a developer-only combobox labeled `User role`, and render a password input labeled `Developer password` only when the selected role differs from the current role. Options must be exactly `user`, `admin`, and `developer`. Non-developers retain ordinary profile editing but have no role controls.

- [ ] **Step 5: Run frontend feature checks**

Run `npx tsx --test frontend/tests/unit/widgets/admin-dashboard/user-role-state.unit.test.ts`, `npm run test:component -w frontend`, `npm run lint -w frontend`, and `npm run typecheck -w frontend`. Expected: all tests PASS and lint/typecheck exit 0.

- [ ] **Step 6: Commit**

`git add frontend/src/entities/user/api/profile-client.ts frontend/src/entities/user/api/index.ts frontend/src/widgets/admin-dashboard/model/types.ts frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts frontend/src/widgets/admin-dashboard/model/use-user-actions.ts frontend/src/widgets/admin-dashboard/ui/users/user-table.tsx frontend/tests/unit/widgets/admin-dashboard/user-role-state.unit.test.ts`

`git commit -m "feat: add developer user role controls"`

### Task 5: Add browser regression coverage

**Files:**
- Modify: `frontend/tests/support/fixtures/app.ts`
- Modify: `frontend/tests/e2e/journeys/administrator/admin-dashboard.e2e.spec.ts`

- [ ] **Step 1: Write the failing journey**

Add a developer session that opens Users, edits Blair, selects Admin, enters the password, saves, checks the Admin badge, and asserts the request body:

```
test("developer can change a user role with password confirmation", async ({ page }) => {
  const spies: ApiSpy[] = [];
  await seedSignedInSession(page, {
    userId: "developer-1",
    email: "developer@example.com",
    isAdmin: true,
    isDeveloper: true,
  });
  await mockCommonApi(page, {
    userId: "developer-1",
    email: "developer@example.com",
    isAdmin: true,
    isDeveloper: true,
  }, spies);

  await page.goto("/admin");
  await page.getByRole("button", { name: /^Users$/i }).click();
  const blairCard = page.locator("div.rounded-2xl")
    .filter({ hasText: "blair@example.com" }).first();
  await blairCard.getByRole("button", { name: /^Edit$/i }).click();
  await page.getByRole("dialog")
    .getByRole("combobox", { name: "User role" }).click();
  await expect(page.getByRole("option"))
    .toHaveText(["User", "Admin", "Developer"]);
  await page.getByRole("option", { name: "Admin" }).click();
  await page.getByLabel("Developer password").fill("developer-password");
  await page.getByRole("button", { name: /Save Changes/i }).click();

  await expect(blairCard).toContainText(/Admin/i);
  const request = spies.find((spy) =>
    spy.url.includes("/api/profiles/admin/users/user-2/role"));
  assert.ok(request);
  assert.deepEqual(JSON.parse(request.postData), {
    role: "admin",
    password: "developer-password",
  });
});
```

Add an assertion to an existing ordinary-admin journey that `User role` and `Developer password` are absent.

- [ ] **Step 2: Run red**

Run `npm run test:e2e:critical -w frontend -- tests/e2e/journeys/administrator/admin-dashboard.e2e.spec.ts`. Expected: FAIL because mocked profiles lack role fields and the dedicated endpoint is unhandled.

- [ ] **Step 3: Extend fixtures without weakening routes**

Add `role` to mocked profiles, initialize the current user as developer/admin/user from session options and Blair as user, and add a dedicated role route before the generic admin-user PUT route. Parse `{ role, password }`, update only mocked target role, return `{ user_id, previous_role, role }`, and never store the password. Preserve existing create/update/delete fixture behavior.

- [ ] **Step 4: Run browser lanes**

Run `npm run test:e2e:critical -w frontend -- tests/e2e/journeys/administrator/admin-dashboard.e2e.spec.ts` and then `npm run test:e2e:critical`. Expected: both PASS within the repositoryÃ¢â‚¬â„¢s 110-second lane limit.

- [ ] **Step 5: Commit**

`git add frontend/tests/support/fixtures/app.ts frontend/tests/e2e/journeys/administrator/admin-dashboard.e2e.spec.ts`

`git commit -m "test: cover developer user role changes"`

### Task 6: Complete affected CI verification

**Files:**
- No source changes; verification only.

- [ ] **Step 1: Inspect final changes**

Run `git status --short`, `git diff --stat master..HEAD`, and `git diff --check`. Confirm pre-existing documentation, report, `.gitignore`, and shared-date-storage changes were not staged.

- [ ] **Step 2: Run repository lint and typecheck**

Run `npm run lint` and `npm run typecheck`. Expected: both exit 0.

- [ ] **Step 3: Run backend CI lanes**

Run `npm run test:unit -w backend`, `npm run test:architecture -w backend`, and `npm run test:backend:integration`. Expected: all PASS.

- [ ] **Step 4: Run frontend and contract lanes**

Run all four commands `npm run test:unit:ci -w frontend -- --shard=1/4` through `--shard=4/4`, then `npm run test:component -w frontend`, `npm run test:integration -w frontend`, `npm run test:architecture -w frontend`, and `npm run test:contract`. Expected: every lane exits 0 without focused/skipped tests.

- [ ] **Step 5: Run build**

Run `npm run build`. Expected: backend TypeScript compilation and frontend Vite build exit 0.

- [ ] **Step 6: Report remote CI accurately**

If pushed, inspect and report the corresponding GitHub Actions run. If not pushed or inaccessible, report remote CI as unverified rather than inferring its result.
