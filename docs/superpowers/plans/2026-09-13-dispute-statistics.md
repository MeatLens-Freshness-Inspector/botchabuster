# Dispute Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete admin dispute statistics to Overview and Reports, plus a numbers-only Disputes tab, using one shared all-history data source.

**Architecture:** Add an admin-protected all-history read at `GET /developer-dashboard/disputes/history`. Load that data with the existing admin dashboard bootstrap, derive pure shared metrics in `widgets/admin-dashboard/model/dispute-analytics.ts`, and render focused KPI, chart, and table components from the existing desktop/mobile dashboard wrappers. Keep pending review and mutation APIs unchanged.

**Tech Stack:** Node.js/Express, TypeScript, Supabase service repository, React 18, Vite, Recharts, Tailwind CSS, shadcn-style UI primitives, Node test runner with `tsx`.

## Global Constraints

- Preserve the existing pending dispute review API and review-queue behavior.
- Use no fabricated dispute data; render `-` for missing optional values and explicit empty states for zero records.
- Define dispute rate as unique disputed inspection IDs divided by inspections in scope, rounded to the nearest whole percent; return zero when the denominator is zero.
- Apply Reports’ date range inclusively to dispute creation timestamps and to the matching inspection denominator.
- Keep the Reports history table complete for every returned dispute in the selected range; do not slice it for display.
- Keep desktop and mobile behavior consistent and preserve responsive horizontal table scrolling.
- Do not weaken or skip existing tests, lint, typecheck, architecture checks, build steps, or CI lanes.
- After every implementation edit, run the smallest affected check; before completion run the complete relevant local CI gates.
- Create at least 20 non-empty commits. Use conventional messages such as `feat:`, `fix:`, `test:`, `refactor:`, and `docs:`; each commit must contain only files belonging to this feature.

## File Map

### Backend

- Modify `backend/src/modules/inspections/domain/ports/InspectionResultDisputeRepository.ts` to expose an all-history repository operation.
- Create `backend/src/modules/inspections/application/ListAllInspectionResultDisputes.ts` as the application boundary for the new read.
- Modify `backend/src/modules/inspections/infrastructure/InspectionResultDisputeService.ts` to query all statuses with the existing related-inspection projection and newest-first ordering.
- Modify `backend/src/modules/inspections/presentation/controllers/InspectionResultDisputeController.ts` to handle the all-history response.
- Modify `backend/src/modules/developer/presentation/dashboard-routes.ts` to register the admin-protected history route.
- Extend `backend/tests/unit/inspections/inspection-result-dispute-service.unit.test.ts`; create `backend/tests/unit/inspections/list-all-inspection-result-disputes.unit.test.ts`; and extend `backend/tests/integration/developer/dashboard-auth.integration.test.ts`.

### Frontend data and model

- Modify `frontend/src/entities/developer-metrics/api/developer-dashboard-client.ts` with `listInspectionResultDisputeHistory()`.
- Create `frontend/src/widgets/admin-dashboard/model/dispute-analytics.ts` with pure types, date filtering, KPI aggregation, status distribution, and daily trend functions.
- Modify `frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts` to load and expose disputes plus dispute analytics.
- Do not modify `frontend/src/widgets/admin-dashboard/model/types.ts`; the new view-model fields use the exported analytics types from `dispute-analytics.ts`.

### Frontend UI

- Create `frontend/src/widgets/admin-dashboard/ui/dispute-statistics.tsx` for the shared five-KPI panel.
- Create `frontend/src/widgets/admin-dashboard/ui/dispute-charts.tsx` for status and daily trend charts.
- Create `frontend/src/widgets/admin-dashboard/ui/dispute-history-table.tsx` for the complete reports table.
- Create `frontend/src/widgets/admin-dashboard/ui/overview/dispute-overview.tsx` to compose overview dispute KPIs and graphs.
- Create `frontend/src/widgets/admin-dashboard/ui/reports-disputes-section.tsx` to compose report-range dispute KPIs, graphs, and history table.
- Modify `frontend/src/widgets/admin-dashboard/ui/overview/inspection-chart.tsx` to include the overview dispute section.
- Modify `frontend/src/widgets/admin-dashboard/ui/reports-tab.tsx` and `frontend/src/widgets/admin-dashboard/ui/mobile-reports-tab.tsx` to include the report dispute section.
- Modify `frontend/src/widgets/admin-dashboard/ui/disputes-tab.tsx` to render only the KPI panel.

### Tests and documentation

- Create `backend/tests/unit/inspections/list-all-inspection-result-disputes.unit.test.ts` for the application boundary.
- Create `frontend/tests/unit/widgets/admin-dashboard/dispute-analytics.unit.test.ts` for pure calculations.
- Create `frontend/tests/unit/entities/developer-dashboard-client.unit.test.ts` for the new endpoint behavior, using the existing `frontend/tests/support/encrypted-fetch.ts` helper.
- Create or extend `frontend/tests/unit/widgets/admin-dashboard/dispute-statistics-ui.unit.test.tsx` for component ownership and numeric-only behavior.
- Create or extend `frontend/tests/unit/widgets/admin-dashboard/reports-ui.unit.test.ts` and `overview-tab.unit.test.ts` for the new exports/render ownership.

---

### Task 1: Lock the backend all-history contract with a failing service test

**Files:**
- Test: `backend/tests/unit/inspections/inspection-result-dispute-service.unit.test.ts`

**Interfaces:**
- Consumes: existing `inspectionResultDisputeService` singleton and Supabase mocking pattern.
- Produces: a failing expectation for `inspectionResultDisputeService.listAllForReview()` returning pending, approved, and rejected records in service order.

- [ ] **Step 1: Write the failing test**

Add a test using the existing `client.from` stub that records `.eq`, `.order`, and `.limit` calls, then asserts the returned array includes all three statuses and that no `.eq("status", ...)` call is made:

```ts
test("all-history dispute reads include every status without a status filter", async () => {
  const { inspectionResultDisputeService } = await import("../../../src/modules/inspections/infrastructure/InspectionResultDisputeService");
  const { supabase } = await import("../../../src/integrations/supabase");
  const client = supabase as any;
  const originalFrom = client.from;
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const records = [
    { ...dispute, status: "rejected" },
    { ...dispute, id: "dispute-2", status: "approved" },
    { ...dispute, id: "dispute-3", status: "pending" },
  ];
  client.from = ((table: string) => {
    assert.equal(table, "inspection_result_disputes");
    const chain = {
      select: (...args: unknown[]) => { calls.push({ method: "select", args }); return chain; },
      order: (...args: unknown[]) => { calls.push({ method: "order", args }); return chain; },
      limit: (...args: unknown[]) => { calls.push({ method: "limit", args }); return chain; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: records, error: null }).then(resolve),
    };
    return chain;
  }) as typeof supabase.from;

  try {
    assert.deepEqual(await inspectionResultDisputeService.listAllForReview(), records);
    assert.equal(calls.some(({ method, args }) => method === "eq" && args[0] === "status"), false);
    assert.deepEqual(calls.filter(({ method }) => method === "order"), [
      { method: "order", args: ["created_at", { ascending: false }] },
      { method: "order", args: ["id", { ascending: false }] },
    ]);
  } finally {
    client.from = originalFrom;
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run `npm run test:unit -w backend -- --test-name-pattern="all-history dispute reads"`.

Expected: FAIL because `listAllForReview` is not yet defined.

- [ ] **Step 3: Commit the failing contract test**

```bash
git add backend/tests/unit/inspections/inspection-result-dispute-service.unit.test.ts
git commit -m "test: define all-history dispute read contract"
```

### Task 2: Implement the repository all-history read

**Files:**
- Modify: `backend/src/modules/inspections/domain/ports/InspectionResultDisputeRepository.ts`
- Modify: `backend/src/modules/inspections/infrastructure/InspectionResultDisputeService.ts`

**Interfaces:**
- Consumes: Task 1’s `listAllForReview()` expectation.
- Produces: `listAllForReview(): Promise<InspectionResultDisputeRecord[]>` on the repository and service.

- [ ] **Step 1: Add the interface method**

Add this method beside `listPendingForReview`:

```ts
listAllForReview(): Promise<InspectionResultDisputeRecord[]>;
```

- [ ] **Step 2: Add the service method**

Implement the method with the existing `DISPUTE_COLUMNS` projection and no status predicate:

```ts
async listAllForReview(): Promise<InspectionResultDisputeRecord[]> {
  const { data, error } = await (supabase
    .from("inspection_result_disputes") as any)
    .select(DISPUTE_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw new Error(`Failed to fetch inspection dispute history: ${error.message}`);
  return (data as InspectionResultDisputeRecord[]) ?? [];
}
```

- [ ] **Step 3: Run the focused test**

Run `npm run test:unit -w backend -- --test-name-pattern="all-history dispute reads"`.

Expected: PASS.

- [ ] **Step 4: Commit the repository implementation**

```bash
git add backend/src/modules/inspections/domain/ports/InspectionResultDisputeRepository.ts backend/src/modules/inspections/infrastructure/InspectionResultDisputeService.ts
git commit -m "feat: add all-history dispute repository read"
```

### Task 3: Add the list-all application use case with tests

**Files:**
- Create: `backend/src/modules/inspections/application/ListAllInspectionResultDisputes.ts`
- Test: `backend/tests/unit/inspections/list-all-inspection-result-disputes.unit.test.ts`

**Interfaces:**
- Consumes: `InspectionResultDisputeRepository.listAllForReview()`.
- Produces: `new ListAllInspectionResultDisputes(repository).execute(): Promise<InspectionResultDisputeRecord[]>`.

- [ ] **Step 1: Write the test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { ListAllInspectionResultDisputes } from "../../../src/modules/inspections/application/ListAllInspectionResultDisputes";
import type { InspectionResultDisputeRepository } from "../../../src/modules/inspections/domain/ports/InspectionResultDisputeRepository";

test("lists all dispute records through the repository boundary", async () => {
  const records = [{ id: "dispute-1", status: "approved" }] as any;
  let called = false;
  const repository = {
    listAllForReview: async () => { called = true; return records; },
  } as Pick<InspectionResultDisputeRepository, "listAllForReview">;

  const result = await new ListAllInspectionResultDisputes(repository as InspectionResultDisputeRepository).execute();

  assert.equal(called, true);
  assert.equal(result, records);
});
```

- [ ] **Step 2: Run to verify it fails**

Run `npm run test:unit -w backend -- --test-name-pattern="lists all dispute records"`.

Expected: FAIL because the use-case file does not exist.

- [ ] **Step 3: Implement the use case**

```ts
import type { InspectionResultDisputeRecord } from "../../../types/inspectionResultDispute";
import type { InspectionResultDisputeRepository } from "../domain/ports/InspectionResultDisputeRepository";

export class ListAllInspectionResultDisputes {
  constructor(private readonly repository: InspectionResultDisputeRepository) {}

  execute(): Promise<InspectionResultDisputeRecord[]> {
    return this.repository.listAllForReview();
  }
}
```

- [ ] **Step 4: Run the test and commit**

Run `npm run test:unit -w backend -- --test-name-pattern="lists all dispute records"`; expect PASS.

```bash
git add backend/src/modules/inspections/application/ListAllInspectionResultDisputes.ts backend/tests/unit/inspections/list-all-inspection-result-disputes.unit.test.ts
git commit -m "feat: add list-all dispute use case"
```

### Task 4: Export the new backend use case

**Files:**
- Modify: `backend/src/modules/inspections/index.ts`

**Interfaces:**
- Consumes: Task 3’s `ListAllInspectionResultDisputes` class.
- Produces: a public module export used by the presentation controller.

- [ ] **Step 1: Add the export**

Add the same style of export already used for pending dispute use cases:

```ts
export { ListAllInspectionResultDisputes } from "./application/ListAllInspectionResultDisputes";
```

- [ ] **Step 2: Run the backend typecheck**

Run `npm run typecheck -w backend`; expect PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/inspections/index.ts
git commit -m "feat: publish all-history dispute use case"
```

### Task 5: Add the controller history handler

**Files:**
- Modify: `backend/src/modules/inspections/presentation/controllers/InspectionResultDisputeController.ts`

**Interfaces:**
- Consumes: Task 3’s exported `ListAllInspectionResultDisputes` and existing `inspectionResultDisputeService`.
- Produces: `listAllForReview(_req: Request, res: Response): Promise<void>` returning a JSON array or the existing standardized error body.

- [ ] **Step 1: Instantiate the use case**

Import `ListAllInspectionResultDisputes` from `../..` and add:

```ts
const listAllDisputes = new ListAllInspectionResultDisputes(inspectionResultDisputeService);
```

- [ ] **Step 2: Add the handler**

Add this method beside `listPendingForReview`:

```ts
async listAllForReview(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await listAllDisputes.execute());
  } catch (error) {
    this.handleError("List inspection dispute history", res, error);
  }
}
```

- [ ] **Step 3: Run targeted backend tests**

Run `npm run test:unit -w backend -- --test-name-pattern="dispute"`; expect all existing dispute tests plus the new use-case/service tests to pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/inspections/presentation/controllers/InspectionResultDisputeController.ts
git commit -m "feat: expose dispute history controller handler"
```

### Task 6: Wire the admin-protected history route

**Files:**
- Modify: `backend/src/modules/developer/presentation/dashboard-routes.ts`

**Interfaces:**
- Consumes: Task 5’s `listAllForReview` controller handler.
- Produces: `GET /developer-dashboard/disputes/history` guarded by `requireAdmin`.

- [ ] **Step 1: Register the route**

Add before the existing pending route or immediately beside it:

```ts
router.get("/disputes/history", requireAdmin, (req, res) => void disputeController.listAllForReview(req, res));
```

- [ ] **Step 2: Validate route ordering and typecheck**

Run `npm run typecheck -w backend`; expect PASS. Confirm the history GET route is distinct from the existing POST `/disputes/:disputeId/...` routes and the pending GET `/disputes` route remains unchanged.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/developer/presentation/dashboard-routes.ts
git commit -m "feat: add admin dispute history route"
```

### Task 7: Add frontend client endpoint coverage

**Files:**
- Test: `frontend/tests/unit/entities/developer-dashboard-client.unit.test.ts`

**Interfaces:**
- Consumes: `frontend/tests/support/encrypted-fetch.ts`, `developerDashboardClient`, and `API_BASE_URL`.
- Produces: a failing test requiring `DeveloperDashboardClient.listInspectionResultDisputeHistory()` to request `/developer-dashboard/disputes/history` with auth headers.

- [ ] **Step 1: Write the failing test**

Use the existing encrypted transport test helper and assert:

```ts
import { installEncryptedFetch } from "../../support/encrypted-fetch";

test("lists complete dispute history from the admin endpoint", async () => {
  let requestUrl = "";
  const responseRecords = [{ id: "dispute-1", status: "approved" }];
  const restoreTransportFetch = installEncryptedFetch(({ input }) => {
    requestUrl = String(input);
    return new Response(JSON.stringify(responseRecords), { status: 200 });
  });

  try {
    const result = await developerDashboardClient.listInspectionResultDisputeHistory();
    assert.deepEqual(result, responseRecords);
  } finally {
    restoreTransportFetch();
  }

  assert.match(requestUrl, /\/developer-dashboard\/disputes\/history$/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run `npm run test:unit -w frontend -- --test-name-pattern="complete dispute history"`.

Expected: FAIL because the client method is missing.

- [ ] **Step 3: Commit the failing client test**

```bash
git add frontend/tests/unit/entities/developer-dashboard-client.unit.test.ts
git commit -m "test: define frontend dispute history client contract"
```

### Task 8: Implement the frontend history client method

**Files:**
- Modify: `frontend/src/entities/developer-metrics/api/developer-dashboard-client.ts`

**Interfaces:**
- Consumes: Task 7’s contract.
- Produces: `listInspectionResultDisputeHistory(): Promise<InspectionResultDispute[]>`.

- [ ] **Step 1: Implement the method**

Add beside `listInspectionResultDisputes`:

```ts
async listInspectionResultDisputeHistory(): Promise<InspectionResultDispute[]> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/developer-dashboard/disputes/history`, {
    headers: this.createHeaders(),
  });
  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, "Failed to fetch inspection dispute history"));
  }
  return response.json();
}
```

- [ ] **Step 2: Run the focused test and typecheck**

Run `npm run test:unit -w frontend -- --test-name-pattern="complete dispute history"` and `npm run typecheck -w frontend`; expect PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/entities/developer-metrics/api/developer-dashboard-client.ts
git commit -m "feat: fetch admin dispute history"
```

### Task 9: Define pure dispute analytics tests

**Files:**
- Test: `frontend/tests/unit/widgets/admin-dashboard/dispute-analytics.unit.test.ts`

**Interfaces:**
- Consumes: `InspectionResultDispute`, `Inspection` fixtures, and the approved KPI/date semantics.
- Produces: failing tests for `buildDisputeAnalytics` and `filterDisputesByDateRange`.

- [ ] **Step 1: Add deterministic fixtures and tests**

Use fixed UTC timestamps and assert status counts, unique disputed inspection rate, stable order, inclusive dates, and empty input:

```ts
test("builds dispute KPIs from unique disputed inspections", () => {
  const result = buildDisputeAnalytics({ disputes: [
    makeDispute("d-1", "i-1", "pending", "2026-09-01T08:00:00.000Z"),
    makeDispute("d-2", "i-1", "approved", "2026-09-02T08:00:00.000Z"),
    makeDispute("d-3", "i-2", "rejected", "2026-09-03T08:00:00.000Z"),
  ], inspections: [makeInspection("i-1"), makeInspection("i-2"), makeInspection("i-3"), makeInspection("i-4")] });

  assert.deepEqual(result.summary, { total: 3, pending: 1, approved: 1, rejected: 1, disputeRate: 50 });
  assert.deepEqual(result.statusDistribution.map(({ status, count }) => ({ status, count })), [
    { status: "pending", count: 1 }, { status: "approved", count: 1 }, { status: "rejected", count: 1 },
  ]);
});

test("filters dispute creation dates inclusively and handles empty data", () => {
  const disputes = [makeDispute("d-1", "i-1", "pending", "2026-09-01T00:00:00.000Z"), makeDispute("d-2", "i-2", "approved", "2026-09-03T23:59:59.999Z")];
  assert.equal(filterDisputesByDateRange(disputes, "2026-09-01", "2026-09-03").length, 2);
  assert.deepEqual(buildDisputeAnalytics({ disputes: [], inspections: [] }).summary, { total: 0, pending: 0, approved: 0, rejected: 0, disputeRate: 0 });
});
```

- [ ] **Step 2: Run to verify it fails**

Run `npm run test:unit -w frontend -- --test-name-pattern="dispute KPIs|filters dispute creation"`.

Expected: FAIL because the analytics module and functions do not exist.

- [ ] **Step 3: Commit the failing analytics tests**

```bash
git add frontend/tests/unit/widgets/admin-dashboard/dispute-analytics.unit.test.ts
git commit -m "test: define dispute analytics semantics"
```

### Task 10: Implement pure dispute analytics

**Files:**
- Create: `frontend/src/widgets/admin-dashboard/model/dispute-analytics.ts`

**Interfaces:**
- Consumes: `Inspection`, `InspectionResultDispute`, `date-fns`, and fixed date-range strings.
- Produces: `filterDisputesByDateRange(disputes, start, end)` and `buildDisputeAnalytics({ disputes, inspections, startDate?, endDate? })`.

- [ ] **Step 1: Implement explicit types and helpers**

Implement these exported types and signatures:

```ts
export type DisputeStatusCount = { status: InspectionResultDisputeStatus; count: number };
export type DisputeDailyTrend = { date: string; count: number };
export type DisputeAnalyticsSummary = { total: number; pending: number; approved: number; rejected: number; disputeRate: number };
export type DisputeAnalytics = { summary: DisputeAnalyticsSummary; statusDistribution: DisputeStatusCount[]; dailyTrend: DisputeDailyTrend[]; filteredDisputes: InspectionResultDispute[] };
export function filterDisputesByDateRange(disputes: InspectionResultDispute[], startDate?: string, endDate?: string): InspectionResultDispute[];
export function buildDisputeAnalytics(input: { disputes: InspectionResultDispute[]; inspections: Inspection[]; startDate?: string; endDate?: string }): DisputeAnalytics;
```

Use `startOfDay(new Date(`${startDate}T00:00:00`))` and `endOfDay(new Date(`${endDate}T00:00:00`))`, return `[]` for an invalid range, count statuses in `pending`, `approved`, `rejected` order, and calculate rate from `new Set(filteredDisputes.map(({ inspection_id }) => inspection_id)).size / inspections.length`. Sort valid daily rows ascending by ISO date and sort records newest first by valid `created_at` with stable original-order fallback.

- [ ] **Step 2: Run the analytics tests**

Run `npm run test:unit -w frontend -- --test-name-pattern="dispute KPIs|filters dispute creation"`; expect PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/widgets/admin-dashboard/model/dispute-analytics.ts
git commit -m "feat: add shared dispute analytics model"
```

### Task 11: Add frontend analytics edge-case coverage

**Files:**
- Test: `frontend/tests/unit/widgets/admin-dashboard/dispute-analytics.unit.test.ts`

**Interfaces:**
- Consumes: Task 10’s pure functions.
- Produces: regression coverage for invalid timestamps, missing inspection IDs, and selected-range denominator behavior.

- [ ] **Step 1: Add edge-case tests**

Assert invalid date rows do not crash chart data, an invalid range returns no filtered records, missing related inspection data does not change rate calculation, and reports calculate rate using inspections in the same selected range.

- [ ] **Step 2: Run the focused tests**

Run `npm run test:unit -w frontend -- --test-name-pattern="dispute analytics"`; expect PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/tests/unit/widgets/admin-dashboard/dispute-analytics.unit.test.ts
git commit -m "test: cover dispute analytics edge cases"
```

### Task 12: Load dispute history in the dashboard model

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts`

**Interfaces:**
- Consumes: Task 8’s `developerDashboardClient.listInspectionResultDisputeHistory` and Task 10’s `buildDisputeAnalytics`.
- Produces: view-model fields `disputes`, `disputeAnalytics`, and `reportDisputeAnalytics`.

- [ ] **Step 1: Add state and bootstrap request**

Add:

```ts
const [disputes, setDisputes] = useState<InspectionResultDispute[]>([]);
```

Include `developerDashboardClient.listInspectionResultDisputeHistory()` in the existing `Promise.all`, set its result with `setDisputes`, and keep the existing developer overview error isolation unchanged.

- [ ] **Step 2: Derive overview and report analytics**

Add:

```ts
const disputeAnalytics = useMemo(
  () => buildDisputeAnalytics({ disputes, inspections }),
  [disputes, inspections],
);
const reportDisputeAnalytics = useMemo(
  () => buildDisputeAnalytics({ disputes, inspections: reportState.reportFilteredInspections, startDate: reportStartDate, endDate: reportEndDate }),
  [disputes, reportEndDate, reportStartDate, reportState.reportFilteredInspections],
);
```

Expose `disputes`, `disputeAnalytics`, and `reportDisputeAnalytics` in the returned `AdminDashboardPageViewModel`.

- [ ] **Step 3: Run typecheck and existing dashboard unit tests**

Run `npm run typecheck -w frontend` and `npm run test:unit -w frontend -- --test-name-pattern="admin dashboard"`; expect PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/widgets/admin-dashboard/model/use-admin-dashboard.ts
git commit -m "feat: load dispute history into admin dashboard"
```

### Task 13: Add shared dispute KPI UI tests

**Files:**
- Test: `frontend/tests/unit/widgets/admin-dashboard/dispute-statistics-ui.unit.test.tsx`

**Interfaces:**
- Consumes: Task 10’s `DisputeAnalytics` shape and the shared `DisputeStatistics` component.
- Produces: failing render tests asserting all five numeric labels and no review-card copy.

- [ ] **Step 1: Write the component test**

Render `DisputeStatistics` with `{ total: 8, pending: 2, approved: 4, rejected: 2, disputeRate: 40 }` and assert the five labels/values are visible, while `Review note`, `Apply developer label`, and `Reason` are absent.

- [ ] **Step 2: Run to verify it fails**

Run `npm run test:component -w frontend -- --test-name-pattern="dispute KPI"`.

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Commit**

```bash
git add frontend/tests/unit/widgets/admin-dashboard/dispute-statistics-ui.unit.test.tsx
git commit -m "test: define dispute KPI panel behavior"
```

### Task 14: Implement the shared KPI panel

**Files:**
- Create: `frontend/src/widgets/admin-dashboard/ui/dispute-statistics.tsx`

**Interfaces:**
- Consumes: `DisputeAnalyticsSummary`, optional `isLoading`, and optional `title`/`description` props.
- Produces: `DisputeStatistics({ summary, isLoading?, title?, description? })` with five accessible numeric cards.

- [ ] **Step 1: Implement the component**

Use existing `Card`, `CardHeader`, and `CardContent` primitives. Render cards from this exact data mapping:

```ts
const metrics = [
  ["Total disputes", summary.total, "count"],
  ["Pending", summary.pending, "count"],
  ["Approved", summary.approved, "count"],
  ["Rejected", summary.rejected, "count"],
  ["Dispute rate", summary.disputeRate, "%"],
] as const;
```

When loading, keep the section `aria-busy="true"` and render `Loading dispute statistics…`; otherwise render the values with `tabular-nums`. Do not import or render review queue controls.

- [ ] **Step 2: Run component tests and lint**

Run `npm run test:component -w frontend -- --test-name-pattern="dispute KPI"` and `npm run lint -w frontend`; expect PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/widgets/admin-dashboard/ui/dispute-statistics.tsx
git commit -m "feat: add shared dispute KPI panel"
```

### Task 15: Add shared dispute chart tests and implementation

**Files:**
- Test: `frontend/tests/unit/widgets/admin-dashboard/dispute-charts-ui.unit.test.tsx`
- Create: `frontend/src/widgets/admin-dashboard/ui/dispute-charts.tsx`

**Interfaces:**
- Consumes: `statusDistribution`, `dailyTrend`, existing `ChartContainer`/Recharts conventions.
- Produces: `DisputeCharts({ statusDistribution, dailyTrend, compact? })` with labeled status and daily trend graphs.

- [ ] **Step 1: Add the failing render test**

Render the component with all three statuses and two daily rows; assert headings `Disputes by status` and `Disputes over time` exist.

- [ ] **Step 2: Run to verify it fails**

Run `npm run test:component -w frontend -- --test-name-pattern="Disputes by status"`; expect FAIL because the module is missing.

- [ ] **Step 3: Implement the chart component**

Use a `BarChart` for status counts and a `BarChart` for daily counts, with visible headings and `ChartTooltip`. Use the existing dashboard chart configuration and primary/status colors; include text fallback `No dispute activity in this period.` when both datasets are empty.

- [ ] **Step 4: Run tests and commit**

Run `npm run test:component -w frontend -- --test-name-pattern="Disputes by status"`; expect PASS.

```bash
git add frontend/src/widgets/admin-dashboard/ui/dispute-charts.tsx frontend/tests/unit/widgets/admin-dashboard/dispute-charts-ui.unit.test.tsx
git commit -m "feat: add dispute status and trend charts"
```

### Task 16: Compose the overview dispute section

**Files:**
- Create: `frontend/src/widgets/admin-dashboard/ui/overview/dispute-overview.tsx`
- Modify: `frontend/src/widgets/admin-dashboard/ui/overview/inspection-chart.tsx`

**Interfaces:**
- Consumes: `dashboard.disputeAnalytics`, shared `DisputeStatistics`, and `DisputeCharts`.
- Produces: overview UI with all five KPIs and both dispute graphs.

- [ ] **Step 1: Create the overview composer**

Implement:

```tsx
export function DisputeOverview({ dashboard }: { dashboard: AdminDashboardPageViewModel }) {
  return (
    <section aria-labelledby="overview-dispute-statistics" className="space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Dispute activity</p>
        <h2 id="overview-dispute-statistics" className="mt-2 font-display text-2xl font-semibold tracking-tight">Inspection result disputes</h2>
        <p className="mt-2 text-sm text-muted-foreground">Review the full resolution mix and recent dispute activity.</p>
      </div>
      <DisputeStatistics summary={dashboard.disputeAnalytics.summary} />
      <DisputeCharts statusDistribution={dashboard.disputeAnalytics.statusDistribution} dailyTrend={dashboard.disputeAnalytics.dailyTrend} />
    </section>
  );
}
```

- [ ] **Step 2: Include it in the existing overview composition**

Render `<DisputeOverview dashboard={dashboard} />` after the existing quality-signals section in `InspectionChart`.

- [ ] **Step 3: Run overview ownership and component tests**

Run `npm run test:unit -w frontend -- --test-name-pattern="complete overview widget"` and `npm run test:component -w frontend -- --test-name-pattern="dispute"`; expect PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/widgets/admin-dashboard/ui/overview/dispute-overview.tsx frontend/src/widgets/admin-dashboard/ui/overview/inspection-chart.tsx
git commit -m "feat: show dispute analytics on overview"
```

### Task 17: Add complete dispute-history table tests

**Files:**
- Test: `frontend/tests/unit/widgets/admin-dashboard/dispute-history-table-ui.unit.test.tsx`

**Interfaces:**
- Consumes: `InspectionResultDispute[]` and `DisputeHistoryTable`.
- Produces: failing tests for required headers, every row rendering, neutral missing values, and empty state.

- [ ] **Step 1: Add the table test**

Render two dispute records, one with an inspection and reviewer metadata and one without optional metadata. Assert `getAllByRole("row").length === 3`, required column headers are present, both dispute IDs are shown, and missing values render `-`. Render `[]` separately and assert `No disputes found in this date range.`.

- [ ] **Step 2: Run to verify it fails**

Run `npm run test:component -w frontend -- --test-name-pattern="dispute-history table"`; expect FAIL because the component is missing.

- [ ] **Step 3: Commit**

```bash
git add frontend/tests/unit/widgets/admin-dashboard/dispute-history-table-ui.unit.test.tsx
git commit -m "test: define complete dispute history table"
```

### Task 18: Implement the complete dispute-history table

**Files:**
- Create: `frontend/src/widgets/admin-dashboard/ui/dispute-history-table.tsx`

**Interfaces:**
- Consumes: `InspectionResultDispute[]` with optional `inspection` and existing dashboard/profile labels.
- Produces: `DisputeHistoryTable({ disputes })` with all returned rows and required fields.

- [ ] **Step 1: Implement table columns**

Use existing table primitives and render these columns in order: Dispute ID, Created, Inspection ID, Inspector/Submitter, Meat type, Model classification, Expected classification, Status, Reason, Reviewed, Reviewer, Reviewer note, Developer label. Use `dispute.inspection?.classification ?? "-"`, `dispute.inspection?.meat_type ?? "-"`, optional dates/reviewers/notes as `-`, and `formatDate` with the existing locale convention. Do not slice the array.

- [ ] **Step 2: Add responsive and accessibility behavior**

Wrap the table in the existing `Table` overflow container, add a caption or nearby description, use semantic `TableHeader`/`TableHead`, and give status cells visible text plus status styling.

- [ ] **Step 3: Run table tests and commit**

Run `npm run test:component -w frontend -- --test-name-pattern="dispute-history table"`; expect PASS.

```bash
git add frontend/src/widgets/admin-dashboard/ui/dispute-history-table.tsx
git commit -m "feat: render complete dispute history table"
```

### Task 19: Compose the Reports dispute section

**Files:**
- Create: `frontend/src/widgets/admin-dashboard/ui/reports-disputes-section.tsx`

**Interfaces:**
- Consumes: `dashboard.reportDisputeAnalytics` and current report date range state.
- Produces: report-range KPI cards, status/trend graphs, and the full history table.

- [ ] **Step 1: Implement the composer**

Render a titled card/section containing:

```tsx
<DisputeStatistics summary={dashboard.reportDisputeAnalytics.summary} title="Dispute report" description="Disputes created within the selected report range." />
<DisputeCharts statusDistribution={dashboard.reportDisputeAnalytics.statusDistribution} dailyTrend={dashboard.reportDisputeAnalytics.dailyTrend} />
<DisputeHistoryTable disputes={dashboard.reportDisputeAnalytics.filteredDisputes} />
```

When the date range is invalid, show `Select a valid date range to view dispute statistics.` and do not render misleading metrics. When valid with zero rows, keep the zero KPIs and the table’s explicit empty state.

- [ ] **Step 2: Run typecheck**

Run `npm run typecheck -w frontend`; expect PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/widgets/admin-dashboard/ui/reports-disputes-section.tsx
git commit -m "feat: compose report dispute analytics"
```

### Task 20: Add Reports desktop integration tests

**Files:**
- Test: `frontend/tests/unit/widgets/admin-dashboard/reports-ui.unit.test.ts`

**Interfaces:**
- Consumes: existing `ReportsTab` export and report component composition.
- Produces: coverage proving Reports publishes the dispute section and all-history table ownership.

- [ ] **Step 1: Extend the test**

Keep the existing function-publication assertions and add a render test using a minimal dashboard fixture that asserts `Dispute report`, `Disputes by status`, and `Dispute ID` are present.

- [ ] **Step 2: Run the test**

Run `npm run test:unit -w frontend -- --test-name-pattern="report widget|Dispute report"`; expect FAIL until integration is wired.

- [ ] **Step 3: Commit the test**

```bash
git add frontend/tests/unit/widgets/admin-dashboard/reports-ui.unit.test.ts
git commit -m "test: cover report dispute analytics ownership"
```

### Task 21: Integrate dispute analytics into desktop Reports

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/ui/reports-tab.tsx`

**Interfaces:**
- Consumes: Task 19’s `ReportsDisputesSection` and existing report controls.
- Produces: desktop Reports with the selected-range dispute report below the existing report summary/export content.

- [ ] **Step 1: Render the section**

Add `<ReportsDisputesSection dashboard={dashboard} />` after the existing two-card grid. Keep date inputs, export buttons, inspection summary, and `aria-busy` behavior unchanged.

- [ ] **Step 2: Run the desktop Reports test and lint**

Run `npm run test:unit -w frontend -- --test-name-pattern="Dispute report"` and `npm run lint -w frontend`; expect PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/widgets/admin-dashboard/ui/reports-tab.tsx
git commit -m "feat: add dispute history to desktop reports"
```

### Task 22: Integrate dispute analytics into mobile Reports

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/ui/mobile-reports-tab.tsx`

**Interfaces:**
- Consumes: Task 19’s shared report section and the mobile report controls.
- Produces: mobile Reports with the same range-aware KPI, graphs, and complete table, using horizontal overflow for the table.

- [ ] **Step 1: Render the shared section**

Add `<ReportsDisputesSection dashboard={dashboard} />` after the existing mobile report preview. Ensure the outer mobile section remains responsive and the table’s overflow wrapper can scroll horizontally without widening the page.

- [ ] **Step 2: Run mobile Reports coverage**

Run `npm run test:component -w frontend -- --test-name-pattern="report dispute|mobile reports"`; expect PASS. If no existing mobile render suite exists, add the smallest ownership assertion to `reports-ui.unit.test.ts` without weakening current coverage.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/widgets/admin-dashboard/ui/mobile-reports-tab.tsx frontend/tests/unit/widgets/admin-dashboard/reports-ui.unit.test.ts
git commit -m "feat: add dispute history to mobile reports"
```

### Task 23: Replace the Disputes tab with numeric KPIs

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/ui/disputes-tab.tsx`
- Test: `frontend/tests/unit/widgets/admin-dashboard/dispute-statistics-ui.unit.test.tsx`

**Interfaces:**
- Consumes: `dashboard.disputeAnalytics` via the existing tab renderer instead of the review queue hook.
- Produces: a numbers-only Disputes tab with no review cards, table, charts, reasons, or action buttons.

- [ ] **Step 1: Update the tab API**

Change the component signature to:

```tsx
export default function DisputesTab({ dashboard }: { dashboard: AdminDashboardPageViewModel }) {
  return <DisputeStatistics summary={dashboard.disputeAnalytics.summary} title="Disputes" description="Current dispute volume and resolution status." />;
}
```

Update desktop and mobile callers to pass `dashboard` and remove the unused `useInspectionDisputeReviewQueue`/`useAuth` imports from this tab.

- [ ] **Step 2: Assert numeric-only behavior**

Update the component test to render the tab and assert exactly the five KPI labels are present while review-action labels, reasons, and table headers are absent.

- [ ] **Step 3: Run focused tests and commit**

Run `npm run test:component -w frontend -- --test-name-pattern="numbers-only|dispute KPI"` and `npm run typecheck -w frontend`; expect PASS.

```bash
git add frontend/src/widgets/admin-dashboard/ui/disputes-tab.tsx frontend/src/widgets/admin-dashboard/ui/desktop-admin-dashboard.tsx frontend/src/widgets/admin-dashboard/ui/mobile-admin-dashboard.tsx frontend/tests/unit/widgets/admin-dashboard/dispute-statistics-ui.unit.test.tsx
git commit -m "feat: make disputes tab numbers-only"
```

### Task 24: Add public ownership assertions for the new UI modules

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/index.ts`
- Test: `frontend/tests/unit/widgets/admin-dashboard/overview-ui.unit.test.ts`
- Test: `frontend/tests/unit/widgets/admin-dashboard/overview-tab.unit.test.ts`

**Interfaces:**
- Consumes: overview/report/dispute components already wired in Tasks 16, 19, 21, 22, and 23.
- Produces: stable public exports and tests that ensure the admin dashboard owns the new surfaces.

- [ ] **Step 1: Export the shared dashboard components**

Follow the existing index export style and add these exact exports:

```ts
export { DisputeStatistics } from "./ui/dispute-statistics";
export { DisputeCharts } from "./ui/dispute-charts";
export { DisputeHistoryTable } from "./ui/dispute-history-table";
export { DisputeOverview } from "./ui/overview/dispute-overview";
export { ReportsDisputesSection } from "./ui/reports-disputes-section";
```

- [ ] **Step 2: Add ownership assertions**

Assert `typeof DisputeOverview === "function"`, `typeof ReportsDisputesSection === "function"`, and the existing Overview/Reports tab exports remain functions.

- [ ] **Step 3: Run focused unit tests and commit**

Run `npm run test:unit -w frontend -- --test-name-pattern="overview widget|complete overview widget|report widget"`; expect PASS.

```bash
git add frontend/src/widgets/admin-dashboard/index.ts frontend/tests/unit/widgets/admin-dashboard/overview-ui.unit.test.ts frontend/tests/unit/widgets/admin-dashboard/overview-tab.unit.test.ts
git commit -m "test: publish dispute dashboard ownership"
```

### Task 25: Add backend/frontend integration and contract checks

**Files:**
- Modify: `backend/tests/integration/developer/dashboard-auth.integration.test.ts`
- Modify: `frontend/tests/unit/widgets/admin-dashboard/dispute-analytics.unit.test.ts`

**Interfaces:**
- Consumes: the final endpoint, dashboard model, and UI composition.
- Produces: coverage for admin route response shape, range filtering, and all-history row rendering at the highest existing test layer without duplicating unit tests.

- [ ] **Step 1: Add the smallest route response test**

In `dashboard-auth.integration.test.ts`, add a test named `developer dashboard dispute history authorization`, stub `inspectionResultDisputeService.listAllForReview` to return three records, request `/api/developer-dashboard/disputes/history` with the existing admin token setup, assert a 200 JSON array containing all statuses, then request with the existing non-admin token setup and assert the same authorization failure status used by existing developer dashboard routes. Restore the stub in the test’s `finally` block.

- [ ] **Step 2: Add the smallest frontend dashboard integration test**

In `dispute-analytics.unit.test.ts`, add a test that passes three disputes and two inspections to `buildDisputeAnalytics`, first with `startDate: "2026-09-01", endDate: "2026-09-03"`, then with `endDate: "2026-09-01"`, and asserts the filtered row count, status counts, and unique-disputed-inspection rate update together.

- [ ] **Step 3: Run affected integration/contract tests**

Run `npm run test:integration -w backend -- --test-name-pattern="developer dashboard dispute history"`, `npm run test:unit -w frontend -- --test-name-pattern="selected-range dispute data flow"`, and `npm run test:contract`; expect PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/tests frontend/tests
git commit -m "test: verify dispute statistics integration"
```

### Task 26: Verify responsive accessibility and repair only feature regressions

**Files:**
- Modify: `frontend/src/widgets/admin-dashboard/ui/dispute-statistics.tsx`, `frontend/src/widgets/admin-dashboard/ui/dispute-charts.tsx`, `frontend/src/widgets/admin-dashboard/ui/dispute-history-table.tsx`, `frontend/src/widgets/admin-dashboard/ui/overview/dispute-overview.tsx`, and `frontend/src/widgets/admin-dashboard/ui/reports-disputes-section.tsx` only when a focused gate exposes a genuine feature regression.
- Test: `frontend/tests/unit/widgets/admin-dashboard/dispute-statistics-ui.unit.test.tsx`, `frontend/tests/unit/widgets/admin-dashboard/dispute-charts-ui.unit.test.tsx`, and `frontend/tests/unit/widgets/admin-dashboard/dispute-history-table-ui.unit.test.tsx` only when an assertion needs to describe the corrected behavior.

**Interfaces:**
- Consumes: all feature code and tests from Tasks 1–25.
- Produces: accessible headings, visible non-color status labels, horizontal table scrolling, no invalid date-range metrics, and clean lint/typecheck output.

- [ ] **Step 1: Run focused checks**

Run:

```bash
npm run lint -w frontend
npm run typecheck -w frontend
npm run test:unit -w frontend -- --test-name-pattern="dispute|overview|report widget"
npm run test:component -w frontend -- --test-name-pattern="dispute|reports"
npm run test:unit -w backend -- --test-name-pattern="dispute"
```

- [ ] **Step 2: Repair failures from their first failing assertion**

Keep tests enabled and assertions meaningful. Do not add focused-only test modifiers, skips, timeout increases, or swallowed errors.

- [ ] **Step 3: Commit verified accessibility/responsive fixes**

```bash
git add frontend/src frontend/tests
git commit -m "fix: polish dispute statistics accessibility"
```

### Task 27: Run the complete local CI-equivalent gates

**Files:**
- No planned source changes; only modify feature files if a gate exposes a genuine feature regression.

**Interfaces:**
- Consumes: the complete implementation and all committed tests.
- Produces: fresh verification evidence for completion.

- [ ] **Step 1: Run repository checks**

Run each lane with the project’s documented commands and the 110-second per-lane policy:

```bash
npm run lint
npm run typecheck
npm run test:scripts
npm run test:documentation
npm run test:unit -w frontend
npm run test:component -w frontend
npm run test:integration -w frontend
npm run test:architecture -w frontend
npm run test:unit -w backend
npm run test:architecture -w backend
npm run test:contract
npm run build
```

- [ ] **Step 2: Run relevant E2E coverage**

Run the administrator dashboard E2E suite using the project’s configured environment and bounded command:

```bash
CI=true timeout 110s npm run test:e2e:critical -w frontend
```

On Windows, use the repository’s documented `npm.cmd` equivalent and record the exact result.

- [ ] **Step 3: Verify git scope and remote CI state**

Run `git diff --check`, `git status --short`, and `git log --oneline -25`. Confirm unrelated pre-existing dirty files are not staged. If remote access is available, inspect the corresponding GitHub Actions run; otherwise state remote CI is unverified.

- [ ] **Step 4: Commit only final feature fixes if needed**

Use a conventional message matching the actual fix, for example:

```bash
git add -- \
  backend/src/modules/inspections \
  backend/src/modules/developer/presentation/dashboard-routes.ts \
  backend/tests/unit/inspections \
  backend/tests/integration/developer/dashboard-auth.integration.test.ts \
  frontend/src/entities/developer-metrics/api/developer-dashboard-client.ts \
  frontend/src/widgets/admin-dashboard \
  frontend/tests/unit/entities/developer-dashboard-client.unit.test.ts \
  frontend/tests/unit/widgets/admin-dashboard
git commit -m "fix: resolve dispute report verification failure"
```

Do not create an empty commit merely to reach the requested count; the plan already contains more than 20 substantive commit points.

## Plan Self-Review

- Spec coverage: backend all-history API is Tasks 1–6; frontend client and shared loading are Tasks 7–12; Overview is Task 16; Reports graphs/table/range integration are Tasks 17–22; numbers-only Disputes is Task 23; accessibility and verification are Tasks 24–27.
- Placeholder scan: no `TBD`, `TODO`, skipped test, or disabled quality gate is part of the plan. Test files, helper imports, route paths, method names, and verification commands are concrete.
- Type consistency: `listAllForReview`, `listInspectionResultDisputeHistory`, `buildDisputeAnalytics`, `DisputeStatistics`, `DisputeCharts`, `DisputeHistoryTable`, `DisputeOverview`, and `ReportsDisputesSection` are named consistently across tasks.
- Scope: the plan keeps one API read, one shared analytics boundary, and focused UI components. No unrelated refactor or dependency is required.
