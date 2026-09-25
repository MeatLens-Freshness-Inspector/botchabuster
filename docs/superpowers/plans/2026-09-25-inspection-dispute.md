# Inspect-Tab Inspection Result Disputes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Let inspectors submit a result dispute inline from the Inspect tab immediately after an online inspection save.

**Architecture:** Keep the existing inspection-dispute API and React Query mutation. Add a presentational Inspect-tab dispute section that is hidden until the workspace has a server inspection ID, then wire the workspace save result and mutation state into that section.

**Tech Stack:** React 18, TypeScript, TanStack Query, existing shadcn-style UI primitives, Node test runner with tsx, JSDOM, and the repository npm CI scripts.

## Global Constraints

- Reuse the existing inspector dispute API and mutation.
- Preserve the existing History dispute workflow.
- Display the dispute action in the post-analysis Inspect-tab flow.
- Leave offline-queued scans undisputable until synchronization creates a server-side inspection ID.
- Enforce the existing 10–2,000 character reason bounds in the UI and rely on the backend for authoritative validation.
- Disable duplicate submission while the mutation is pending.
- Do not add a backend route, database migration, or API contract.
- Do not commit generated files under the ignored backend/uploads/ directory.

---

### Task 1: Build the Inspect-tab dispute section

**Files:**
- Create: frontend/src/features/inspection-disputes/ui/inspection-dispute-section.tsx
- Test: frontend/tests/component/inspection-disputes/inspection-dispute-section.component.test.tsx

**Interfaces:**
- Consumes inspectionId: string | null, classification: FreshnessClassification, isSubmitting: boolean, isSubmitted: boolean, and onSubmit(input: { expectedClassification: FreshnessClassification; reason: string }): void | Promise<void>.
- Produces an inline section that returns null without an inspection ID, opens an expected-result/reason form from a “Dispute result” button, and shows “Pending review” after a successful submission.

- [ ] **Step 1: Write the failing component tests**

Create a JSDOM component test that renders the section with inspectionId null and asserts no dispute copy is present. Render it again with inspectionId "inspection-1", click the “Dispute result” button, fill the expected-result select with spoiled, fill the reason with a ten-plus-character explanation, submit the form, and assert the callback receives the selected classification and trimmed reason. Render with isSubmitted true and assert “Pending review” is shown.

The test must set globalThis.window, document, HTMLElement, and IS_REACT_ACT_ENVIRONMENT, use createRoot/act, and restore globals and unmount in finally, matching the existing component-test pattern.

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

~~~text
npm run test:component -w frontend -- --test-name-pattern="Inspect-tab dispute section"
~~~

Expected: FAIL because the component file does not exist yet.

- [ ] **Step 3: Implement the minimal dispute section**

Create the component with this prop contract:

~~~tsx
type InspectionDisputeSectionProps = {
  inspectionId: string | null;
  classification: FreshnessClassification;
  isSubmitting: boolean;
  isSubmitted: boolean;
  onSubmit: (input: {
    expectedClassification: FreshnessClassification;
    reason: string;
  }) => void | Promise<void>;
};
~~~

Return null when inspectionId is empty. Use local state for isFormOpen, expectedClassification (initially the supplied classification), and reason. Render a bordered section with a Scale icon, “Dispute result” button, select options from FRESHNESS_CLASSIFICATIONS, a required textarea with minLength={10} and maxLength={2000}, a character counter, and a submit button disabled while isSubmitting or when the trimmed reason is shorter than ten characters. On submit, prevent the browser default and call onSubmit with the trimmed reason. Do not clear the form in the component; the parent controls success state so errors leave the form intact. When isSubmitted is true, render the pending-review confirmation instead of the form.

- [ ] **Step 4: Run the focused test to verify it passes**

Run the same command. Expected: the new Inspect-tab dispute component tests pass with zero failures.

- [ ] **Step 5: Commit the self-contained UI task**

~~~text
git add frontend/src/features/inspection-disputes/ui/inspection-dispute-section.tsx frontend/tests/component/inspection-disputes/inspection-dispute-section.component.test.tsx
git commit -m "feat: add inspect-tab dispute form"
~~~

### Task 2: Wire saved inspection state into the Inspect tab

**Files:**
- Modify: frontend/src/widgets/inspection-workspace/model/types.ts
- Modify: frontend/src/widgets/inspection-workspace/model/use-inspection-workspace.ts
- Modify: frontend/src/widgets/inspection-workspace/ui/inspection-workspace.tsx
- Test: frontend/tests/unit/widgets/inspection-workspace/inspection-dispute-wiring.unit.test.ts

**Interfaces:**
- Consumes the Task 1 InspectionDisputeSection callback contract.
- Produces savedInspectionId, isSubmitDisputePending, isDisputeSubmitted, and onSubmitDispute on InspectPageViewModel.

- [ ] **Step 1: Write the failing wiring test**

Add a source-contract test that reads use-inspection-workspace.ts and inspection-workspace.tsx and asserts the workspace stores the returned createdInspection.id, clears saved-dispute state in handleCapture and handleReset, renders InspectionDisputeSection, and passes savedInspectionId. This test prevents the UI from being added without the server ID handoff that makes the endpoint usable.

- [ ] **Step 2: Run the wiring test to verify it fails**

Run:

~~~text
npm run test:unit -w frontend -- --test-name-pattern="inspect workspace wires saved inspection disputes"
~~~

Expected: FAIL because the workspace has no saved inspection ID or dispute section wiring.

- [ ] **Step 3: Add saved inspection and mutation state**

In use-inspection-workspace.ts:

1. Import useSubmitInspectionDispute and the Task 1 UI component.
2. Add savedInspectionId and isDisputeSubmitted state, initialized to null and false.
3. Add const submitDispute = useSubmitInspectionDispute().
4. In the successful online createInspection.mutateAsync(...) branch, store the returned inspection ID with setSavedInspectionId(savedInspection.id) and reset setIsDisputeSubmitted(false) before showing the saved toast.
5. Clear both states in handleCapture and handleReset. Do not set a server ID for the offline queue branch.
6. Add handleSubmitDispute that returns when savedInspectionId is absent, calls submitDispute.mutateAsync with the saved ID and form input, marks the dispute submitted on success, and shows toast.error(...) on failure without throwing away the form state.
7. Expose savedInspectionId, isSubmitDisputePending: submitDispute.isPending, isDisputeSubmitted, and onSubmitDispute: handleSubmitDispute from the view model.

Extend InspectPageViewModel with the exact properties above and their types.

- [ ] **Step 4: Render the dispute section in the Inspect tab**

In inspection-workspace.tsx, render InspectionDisputeSection after InspectActionsSection with:

~~~tsx
<InspectionDisputeSection
  inspectionId={inspectPage.savedInspectionId}
  classification={inspectPage.result?.classification ?? "fresh"}
  isSubmitting={inspectPage.isSubmitDisputePending}
  isSubmitted={inspectPage.isDisputeSubmitted}
  onSubmit={inspectPage.onSubmitDispute}
/>
~~~

The component itself stays hidden until savedInspectionId is present, so a captured-but-unsaved result and an offline-queued result do not show an unusable dispute action.

- [ ] **Step 5: Run focused tests and typecheck**

Run:

~~~text
npm run test:unit -w frontend -- --test-name-pattern="inspect workspace wires saved inspection disputes"
npm run test:component -w frontend -- --test-name-pattern="Inspect-tab dispute section"
npm run typecheck
~~~

Expected: all focused tests pass and TypeScript reports no errors.

- [ ] **Step 6: Commit the workspace integration task**

~~~text
git add frontend/src/widgets/inspection-workspace/model/types.ts frontend/src/widgets/inspection-workspace/model/use-inspection-workspace.ts frontend/src/widgets/inspection-workspace/ui/inspection-workspace.tsx frontend/tests/unit/widgets/inspection-workspace/inspection-dispute-wiring.unit.test.ts
git commit -m "feat: enable inspect-tab result disputes"
~~~

### Task 3: Run the complete quality gate and prepare the merge

**Files:**
- Modify: none unless a verification failure identifies a feature regression.

- [ ] **Step 1: Run the frontend lint and typecheck gates**

~~~text
npm run lint
npm run typecheck
~~~

Expected: both commands exit with code 0.

- [ ] **Step 2: Run the full repository test gate**

Ensure the ignored runtime directory exists, without adding files to Git:

~~~text
New-Item -ItemType Directory -Force backend/uploads | Out-Null
npm test
~~~

Expected: all scripts, documentation, frontend, backend, integration, and contract tests pass with zero failures. Existing warnings may remain if they do not produce a non-zero exit code.

- [ ] **Step 3: Run the production build gate**

~~~text
npm run build
~~~

Expected: the repository build exits with code 0.

- [ ] **Step 4: Review the final diff and commit state**

~~~text
git status --short
git log --oneline -4
git diff master...HEAD --stat
~~~

Expected: only the approved spec, plan, and feature files are changed; generated upload files are absent.

- [ ] **Step 5: Merge the verified branch into master**

From the main checkout:

~~~text
git switch master
git merge --ff-only feat/inspection-dispute
~~~

Expected: master advances through the design, plan, and feature commits without a merge conflict.

