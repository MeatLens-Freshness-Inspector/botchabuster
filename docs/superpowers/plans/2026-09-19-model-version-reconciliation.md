# Model Version Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure Supabase records every current and historical MeatLens model version.

**Architecture:** Add one idempotent SQL reconciliation migration and one source-level migration regression test. Do not edit prior migrations or mutate existing model rows.

**Tech Stack:** Supabase PostgreSQL migrations and Node test runner.

## Global Constraints

- Preserve existing version keys and rows.
- Use `ON CONFLICT (version_key) DO NOTHING`.
- Stage only the migration, its regression test, and this design/plan documentation.

### Task 1: Reconcile and verify model versions

**Files:**
- Create: `backend/supabase/migrations/20260919110000_reconcile_all_model_versions.sql`
- Modify: `backend/tests/unit/infrastructure/model-accuracy-migration.unit.test.ts`

- [ ] Add all eight current/historical model keys to the new migration.
- [ ] Assert all eight keys and idempotency in the migration test.
- [ ] Run the direct migration test, review the staged diff, commit, and push to `origin/master`.
