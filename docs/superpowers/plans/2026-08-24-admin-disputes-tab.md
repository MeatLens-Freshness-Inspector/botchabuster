# Admin Disputes Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make inspection disputes a top-level Admin Dashboard tab visible to admins and developers, while keeping Developer Settings developer-only.

**Architecture:** Keep the existing admin-authorized dispute client and review card UI, but move queue state and mutations into a dedicated inspection-dispute review hook. Add the Disputes tab to the shared admin tab list and render the same review surface on desktop and mobile; remove dispute loading/rendering from the nested developer workspace.

**Tech Stack:** React, TypeScript, lucide-react, Node test runner with `tsx`, existing Admin Dashboard and developer-metrics API client.

## Global Constraints

- No database, migration, backend route, or authorization changes.
- Admins can review official results; developers can also apply the dispute to the developer dataset.
- Developer-only API calls must not run when a regular admin opens Disputes.
- Preserve the unrelated untracked PDF in the repository root.

---

### Task 1: Lock the top-level tab contract with failing tests

**Files:**
- Modify: `frontend/tests/unit/state/developer-dashboard-role-gating.unit.test.tsx`
- Modify: `frontend/tests/unit/state/developer-dashboard-workspace.unit.test.tsx`

**Interfaces:**
- Consumes: `getAdminDashboardTabs`, `coerceAdminDashboardTab`, and the nested developer workspace tab rendering.
- Produces: failing assertions that define Disputes as an admin-visible top-level tab and remove it from the developer workspace.

- [ ] **Step 1: Write the failing assertions**

Add assertions that `getAdminDashboardTabs(false)` contains `{ key: "disputes", label: "Disputes" }`, that developers receive both `disputes` and `developer`, that `coerceAdminDashboardTab("disputes", false)` remains `"disputes"`, and that the nested developer tab labels no longer include `Disputes`.

- [ ] **Step 2: Run the focused tests to verify failure**

Run from `frontend`:

```powershell
npx tsx --test tests/unit/state/developer-dashboard-role-gating.unit.test.tsx tests/unit/state/developer-dashboard-workspace.unit.test.tsx
```

Expected: failure because Disputes is not in the shared admin tab list and is still in the nested developer tabs.

### Task 2: Extract the dispute review queue

**Files:**
- Create: `frontend/src/features/inspection-disputes/model/use-inspection-dispute-review-queue.ts`
- Create: `frontend/tests/unit/features/inspection-disputes/use-inspection-dispute-review-queue.unit.test.tsx`
- Modify: `frontend/src/features/developer-tools/model/use-developer-dashboard.ts`
- Modify: `frontend/src/features/developer-tools/index.ts`
- Modify: `frontend/src/features/developer-tools/ui/developer-tab-content.tsx`
- Modify: `frontend/src/features/developer-tools/ui/disputes-section.tsx`

**Interfaces:**
- Consumes: `developerDashboardClient.listInspectionResultDisputes`, `applyInspectionDisputeToDeveloperDataset`, and `reviewInspectionResultDispute`.
- Produces: `useInspectionDisputeReviewQueue()` returning `disputes`, `isLoading`, `loadDisputes`, `applyDeveloperLabel`, and `reviewDispute`.

- [ ] **Step 1: Add a focused queue-hook test**

Add a test harness that mounts `useInspectionDisputeReviewQueue`, stubs the existing client methods, and asserts that it loads pending disputes and removes an item after a successful review mutation.

- [ ] **Step 2: Run the new test to verify failure**

Run:

```powershell
npx tsx --test tests/unit/features/inspection-disputes/use-inspection-dispute-review-queue.unit.test.tsx
```

Expected: module/function failure because the dedicated hook does not exist.

- [ ] **Step 3: Implement the hook and remove queue ownership from the developer dashboard hook**

Move the dispute state, loading state, loader, and two mutations into the dedicated hook. The hook must load only when its component mounts and must remove a successfully processed dispute from local state. Remove the dispute-specific state/effects/return values from `useDeveloperDashboard`, and remove the nested Disputes tab/content from `DeveloperTabContent`.

- [ ] **Step 4: Rename the review section to a role-neutral component**

Rename `DeveloperDisputesSection` to `InspectionDisputeReviewSection`, update its export and imports, and preserve its existing buttons and copy. The component remains responsible only for rendering cards and invoking callbacks.

- [ ] **Step 5: Run focused queue and developer workspace tests**

Run:

```powershell
npx tsx --test tests/unit/features/inspection-disputes/use-inspection-dispute-review-queue.unit.test.tsx tests/unit/state/developer-dashboard-workspace.unit.test.tsx
```

Expected: PASS.

### Task 3: Add the top-level Disputes tab on desktop and mobile

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/model/types.ts`
- Modify: `frontend/src/widgets/admin-dashboard/lib/dashboard.ts`
- Create: `frontend/src/widgets/admin-dashboard/ui/disputes-tab.tsx`
- Modify: `frontend/src/widgets/admin-dashboard/ui/desktop-admin-dashboard.tsx`
- Modify: `frontend/src/widgets/admin-dashboard/ui/mobile-admin-dashboard.tsx`

**Interfaces:**
- Consumes: `useInspectionDisputeReviewQueue` and `InspectionDisputeReviewSection`.
- Produces: an `AdminDashboardTabKey` value `"disputes"` available in the shared tab list.

- [ ] **Step 1: Add the shared tab contract**

Add `"disputes"` to `AdminDashboardTabKey`, add a `Disputes` tab with a relevant lucide icon to `ADMIN_DASHBOARD_TABS`, and leave `Developer Settings` conditional on `isDeveloper`. Ensure `coerceAdminDashboardTab` only redirects the developer tab for non-developers.

- [ ] **Step 2: Implement the shared Disputes tab component**

Create a component that calls `useInspectionDisputeReviewQueue` and passes its state and callbacks to `InspectionDisputeReviewSection`.

- [ ] **Step 3: Render it from both dashboard layouts**

Add the `disputes` switch case to desktop and mobile renderers. Keep the existing `developer` case unchanged except that its nested workspace no longer contains disputes.

- [ ] **Step 4: Run the role-gating and dashboard composition tests**

Run:

```powershell
npx tsx --test tests/unit/state/developer-dashboard-role-gating.unit.test.tsx tests/unit/widgets/admin-dashboard/dashboard-composition.unit.test.ts tests/unit/widgets/admin-dashboard/dashboard-model.unit.test.ts
```

Expected: PASS.

### Task 4: Full verification and commit

**Files:**
- Modify: any files required by the focused test or typecheck failures only.

- [ ] **Step 1: Run the frontend unit suite**

```powershell
npm run test:unit
```

Expected: all frontend unit tests pass.

- [ ] **Step 2: Run typecheck and architecture tests**

```powershell
npm run typecheck
npm run test:architecture
```

Expected: exit code 0 for both commands.

- [ ] **Step 3: Commit the implementation**

```powershell
git add frontend/src frontend/tests
git commit -m "feat: promote disputes to admin dashboard tab"
```
