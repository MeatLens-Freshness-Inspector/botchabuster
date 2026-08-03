# CI/CD Design

## Summary

Strengthen repository CI and add preview-oriented CD where it is practical without changing the current hosting model. GitHub Actions becomes the visible automation layer for validation, change detection, and preview orchestration, while Netlify and Render remain the systems that actually host the frontend and backend because both are already connected directly to the repository.

This design is intentionally constrained to GitHub Free capabilities. It avoids assumptions about paid GitHub features, relies on standard GitHub Actions workflows, and treats provider webhooks as optional enhancements rather than core requirements.

## Goal

Provide clear, path-aware CI for this monorepo and add GitHub-visible preview CD behavior for frontend and backend changes without enabling automatic production deployments.

## Approved Scope

This design covers:

- GitHub Actions workflow structure for CI and preview-oriented CD
- path-aware job execution for frontend, backend, shared, and docs-only changes
- preview deploy signaling and optional webhook triggering for Netlify and Render
- manual preview redeploy helpers
- documentation updates for local maintainers

This design does not cover:

- automatic production deployment from GitHub Actions
- replacing Netlify or Render as deployment providers
- ephemeral per-PR infrastructure beyond what the current providers already support
- mobile app store release pipelines for Android or iOS

## Constraints

- The repository uses GitHub Free, not GitHub Pro.
- The frontend remains deployed through Netlify and the backend remains deployed through Render.
- Both providers stay directly connected to the repository.
- Production deployment remains provider-managed and out of scope for GitHub Actions.
- Preview automation must degrade cleanly when optional provider hook secrets are not configured.
- CI should skip expensive work for docs-only changes.
- The solution should reuse existing npm workspace scripts rather than introduce a new CI toolchain.

## Current State

The repository already contains:

- a broad CI workflow in `.github/workflows/test-architecture.yml`
- a Render keep-awake workflow in `.github/workflows/keep-awake.yml`
- deployment configuration in `netlify.toml` and `render.yaml`
- root workspace scripts that already express the main validation and build commands

Current issues:

- CI is broad but not path-aware, so frontend and backend changes pay similar cost even when only one surface changed.
- CI and CD responsibilities are mixed conceptually because the current workflow only validates and does not clearly indicate preview deployment behavior.
- There is no dedicated workflow for preview redeploy signaling or manual preview refresh.
- GitHub does not currently provide a concise summary of which preview surfaces are expected after a pull request.

## Design Principles

### Keep provider-native deploys

Netlify and Render already know how to deploy this repository. The design should not fight that. GitHub Actions should coordinate, validate, and optionally request refreshes, but not become a second competing deployment platform.

### Prefer GitHub-visible automation

Where feasible, automation should appear in GitHub Actions so pull requests show CI state and preview intent in one place. This satisfies the requirement to "use GA if possible" without forcing Actions to own production delivery.

### Treat preview triggering as optional

Preview deploy hooks are useful, but they should never be required for the repository to function. If a hook secret is absent, the workflow should report that preview deployment remains provider-native and continue successfully.

### Avoid paid GitHub assumptions

Do not rely on GitHub Enterprise or GitHub Pro specific workflow features. Use standard workflow triggers, job outputs, reusable shell logic, job summaries, and repository secrets only.

## Target Workflow Architecture

### 1. Main CI workflow

Create a single primary workflow at `.github/workflows/ci.yml` that becomes the canonical validation pipeline for pull requests, relevant branch pushes, and manual dispatch.

Responsibilities:

- detect changed paths early
- short-circuit docs-only changes
- run only the frontend, backend, shared, or full validation jobs required by the change set
- keep the existing fast-versus-slower suite split
- publish a short job summary that explains what ran and what was intentionally skipped

This workflow should absorb the role of `test-architecture.yml` so contributors have one obvious CI entrypoint.

### 2. Preview workflow

Create a dedicated `.github/workflows/preview.yml` for pull requests and manual dispatch.

Responsibilities:

- use the same path classification model as CI
- report whether frontend preview, backend preview, both, or neither are relevant
- optionally call a Netlify preview build hook when frontend-affecting changes occur and `NETLIFY_BUILD_HOOK_URL` is configured
- optionally call a Render deploy hook when backend-affecting changes occur and `RENDER_DEPLOY_HOOK_URL` is configured
- publish a concise Actions summary with expected preview URLs or provider-managed notes

This workflow is preview-oriented CD, not production CD.

### 3. Manual preview refresh workflow

Create `.github/workflows/deploy-refresh.yml` as a manual-only workflow.

Responsibilities:

- accept boolean inputs for frontend and backend refresh
- invoke the same optional provider hooks used by the preview workflow
- allow maintainers to recover from stale or failed preview environments without pushing no-op commits

### 4. Existing keep-awake workflow

Keep `.github/workflows/keep-awake.yml` separate because it solves a hosting concern rather than a validation or preview concern.

## Path Detection Model

The workflows should classify changes into these buckets:

- `frontend`
  - `frontend/**`
  - `netlify.toml`
- `backend`
  - `backend/**`
  - `render.yaml`
- `shared`
  - root `package.json`
  - root `package-lock.json`
  - `.npmrc`
  - `scripts/**`
  - root `tests/**`
  - top-level TypeScript config or shared build config files
- `docs-only`
  - `README.md`
  - `documentation/**`
  - `docs/**`
  - markdown files that do not affect build or deployment behavior

Rules:

- `shared` implies both frontend and backend validation unless the changed shared file is proven to affect only one side.
- `docs-only` should bypass expensive validation and preview jobs.
- workflow files under `.github/workflows/**` should be treated as shared because they can affect both CI surfaces.

## CI Job Design

### Baseline jobs

The CI workflow should preserve the current useful lanes:

- lint and typecheck
- backend unit tests
- backend integration tests
- frontend unit, component, and integration tests
- contract tests
- build verification
- critical Playwright

### Path-aware execution

- frontend-only changes run frontend validation, root lint/typecheck, build, and critical E2E only when needed by frontend paths or shared paths
- backend-only changes run backend validation, root lint/typecheck, build, and backend integration/contract checks when needed
- shared changes run both surfaces
- docs-only changes run a minimal lightweight job that records the skip decision

### Push and manual behavior

The CI workflow should run on:

- `pull_request`
- pushes to `master`
- `workflow_dispatch`

Scheduled runs for slow suites can remain separate if desired, but this design does not require adding more schedules immediately.

## Preview CD Design

### Frontend preview behavior

Frontend preview delivery remains Netlify-native because the repository is already connected there.

GitHub Actions should:

- report that a frontend preview is expected when frontend-affecting changes exist
- optionally trigger `NETLIFY_BUILD_HOOK_URL` when configured
- include the configured public site URL if `NETLIFY_SITE_URL` is present
- otherwise explain that preview creation is provider-managed through the existing Netlify repository integration

This keeps Netlify as the source of deployed preview assets while making the intent visible in GitHub.

### Backend preview behavior

Backend preview delivery is more conditional because Render setups vary.

GitHub Actions should:

- report that backend preview or staging refresh is expected when backend-affecting changes exist
- optionally trigger `RENDER_DEPLOY_HOOK_URL` when configured
- include the configured public backend URL or health endpoint if `RENDER_SERVICE_URL` is present
- otherwise explain that backend preview remains provider-managed or manual under the current Render setup

This satisfies "where feasible" without assuming Render preview environments that may not exist on the current plan.

### No production deploy automation

The design intentionally does not add a workflow that deploys production from `master`. Netlify and Render can continue to auto-deploy production according to their existing repository connections and provider settings.

## Secrets And Configuration

Optional repository secrets:

- `NETLIFY_BUILD_HOOK_URL`
- `RENDER_DEPLOY_HOOK_URL`

Optional repository variables or secrets for summaries:

- `NETLIFY_SITE_URL`
- `RENDER_SERVICE_URL`

Behavior rules:

- missing optional hook secrets should not fail the workflow
- malformed or failing hook calls should fail the preview job only when the workflow was explicitly asked to invoke that configured hook
- URLs used only for summaries should never be required for workflow success

## GitHub Free Considerations

This design assumes only features available on standard GitHub Free repositories:

- GitHub Actions workflows
- repository secrets and variables
- branch and pull request triggers
- job summaries and artifacts
- required status checks only if the repository already uses branch protection that supports them

This design deliberately avoids depending on:

- paid deployment environment features
- environment approval gates
- merge queue
- advanced enterprise policy controls

If a future repository plan unlocks richer deployment controls, they can be layered on later without changing the basic workflow split.

## Documentation Changes

Update deployment and contributor docs so they explain:

- which workflow is the canonical CI pipeline
- how preview orchestration works for frontend and backend
- which secrets are optional
- how to manually refresh previews from GitHub Actions
- that GitHub Actions preview workflows complement but do not replace Netlify and Render repository integrations

## Error Handling

### Docs-only changes

The workflows should explicitly say that expensive jobs were skipped because the change set is docs-only.

### Missing secrets

If a preview hook secret is absent, the workflow should emit a neutral summary such as:

- frontend preview remains provider-managed because `NETLIFY_BUILD_HOOK_URL` is not configured
- backend preview remains provider-managed because `RENDER_DEPLOY_HOOK_URL` is not configured

### Hook failures

If a configured provider hook returns a failure:

- the preview workflow should fail the relevant preview job
- the summary should name the surface that failed
- CI success should remain independent of preview hook success so code validation and deploy-refresh signaling are not conflated

## Testing And Verification Strategy

Verification should cover:

- path classification for frontend-only, backend-only, shared, docs-only, and workflow-only changes
- CI job gating so only relevant suites run
- preview workflow behavior with hooks configured and not configured
- manual preview refresh inputs for frontend-only, backend-only, and both
- no regression to the existing keep-awake workflow

Repository-level verification after implementation should include:

- workflow syntax validation
- one local dry-read of generated YAML files
- targeted test or script coverage for any path-filter helper logic if it is implemented as a script

## Risks And Mitigations

### Risk: duplicate preview deploys

If GitHub Actions triggers a provider hook while the provider is also already redeploying from the repository connection, previews may refresh twice.

Mitigation:

- make hook triggering optional
- use hooks primarily for explicit preview refresh or for teams that want GA-originated visibility
- document the tradeoff clearly

### Risk: path filters become stale

As the repo evolves, new shared files could be omitted from the classifier.

Mitigation:

- centralize path classification logic in one workflow step or helper script
- document the classification rules
- include workflow files in the shared bucket

### Risk: preview failures distract from code quality

If CI and preview orchestration share the same workflow, a hosting refresh problem can look like a code validation failure.

Mitigation:

- keep CI and preview workflows separate
- reserve merge-blocking status for validation workflows

### Risk: GitHub Free minutes are wasted

Broad workflows on every change can consume unnecessary Actions minutes.

Mitigation:

- short-circuit docs-only changes
- gate frontend and backend jobs by path
- keep slower suites separate from every small change when possible

## Acceptance Criteria

This design is successful when:

- the repository has one clear primary CI workflow
- CI execution is path-aware and skips expensive work for docs-only changes
- preview-oriented CD is visible in GitHub Actions for pull requests
- Netlify and Render remain the actual deployment providers
- optional preview hook secrets enhance the workflow but are not required
- no new workflow performs automatic production deployment
- the design works within GitHub Free constraints
