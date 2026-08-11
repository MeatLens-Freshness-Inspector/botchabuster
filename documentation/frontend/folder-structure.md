# Frontend Folder Structure - Complete File Listing

This document is the source-of-truth inventory for the frontend after the full feature-sliced migration. It is generated from the tracked files under `frontend/`; update it whenever a source boundary or tracked frontend file is added, removed, or moved.

## Root Directory

```text
frontend/
|-- .dockerignore
|-- .env.example
|-- .gitignore
|-- Dockerfile
|-- README.md
|-- bun.lockb
|-- components.json
|-- eslint.config.js
|-- index.html
|-- nginx.conf
|-- package.json
|-- package-lock.json
|-- playwright.config.ts
|-- playwright-fixture.ts
|-- postcss.config.js
|-- tailwind.config.ts
|-- tsconfig.app.json
|-- tsconfig.json
|-- tsconfig.node.json
\-- vite.config.ts
```

The following are intentionally excluded from the source inventory: `frontend/dist/`, `frontend/node_modules/`, Playwright reports/results, local `.env` files, debug logs, and other generated or machine-local output.

## src/ - Application Source

The source tree follows Feature-Sliced Design:

- `app/` owns composition, providers, layouts, routing, route guards, global styles, and the application entry.
- `pages/` owns route-level screens and page composition.
- `widgets/` owns reusable page-scale compositions such as navigation, dashboards, messages, history, legal content, and the inspection workspace.
- `features/` owns user-facing workflows and interactions, including authentication, capture, submission, reports, offline analysis/sync, developer tools, onboarding, profile editing, tutorials, and public landing behavior.
- `entities/` owns business concepts, typed API clients, caches, domain types, and entity public APIs.
- `shared/` owns reusable UI primitives, transport/platform adapters, cross-cutting utilities, and stable foundations.
- `test/` owns shared test setup only.

Dependency direction is inward: `app` composes pages and widgets; pages/widgets use features and entities; features use entities and shared; entities use shared. Lower layers do not import higher layers. Public `index.ts` files are the supported cross-slice entry points.

```text
src/
|-- app/
|   |-- config/
|   |   \-- query-client.ts
|   |-- layouts/
|   |   |-- app-layout.tsx
|   |   \-- public-layout.tsx
|   |-- providers/
|   |   |-- auth-provider.tsx
|   |   |-- index.ts
|   |   |-- network-provider.tsx
|   |   |-- notification-provider.tsx
|   |   |-- query-provider.tsx
|   |   \-- theme-controller.tsx
|   |-- router/
|   |   |-- guards/
|   |   |   |-- admin-route.tsx
|   |   |   |-- onboarding-route.tsx
|   |   |   \-- protected-route.tsx
|   |   |-- app-router.tsx
|   |   \-- paths.ts
|   |-- styles/
|   |   |-- app.css
|   |   \-- globals.css
|   |-- app-composition.tsx
|   |-- App.tsx
|   \-- index.ts
|-- entities/
|   |-- access-code/
|   |   |-- api/
|   |   |   \-- access-code-client.ts
|   |   \-- index.ts
|   |-- audit-log/
|   |   |-- api/
|   |   |   \-- audit-log-client.ts
|   |   \-- index.ts
|   |-- developer-metrics/
|   |   |-- api/
|   |   |   \-- developer-dashboard-client.ts
|   |   \-- index.ts
|   |-- inspection/
|   |   |-- api/
|   |   |   |-- index.ts
|   |   |   |-- inspection-client.ts
|   |   |   |-- inspection-history-cache.ts
|   |   |   \-- sqlite-cache.ts
|   |   |-- model/
|   |   |   |-- location.ts
|   |   |   |-- mutations.ts
|   |   |   |-- pre-scan.ts
|   |   |   |-- queries.ts
|   |   |   \-- types.ts
|   |   |-- ui/
|   |   |   |-- analysis-result-card.tsx
|   |   |   |-- freshness-badge.tsx
|   |   |   \-- inspection-list-item.tsx
|   |   \-- index.ts
|   |-- landing-stats/
|   |   |-- api/
|   |   |   \-- landing-stats-client.ts
|   |   \-- index.ts
|   |-- market-location/
|   |   |-- api/
|   |   |   \-- market-location-client.ts
|   |   |-- model/
|   |   |   |-- defaults.ts
|   |   |   \-- normalize.ts
|   |   \-- index.ts
|   |-- message/
|   |   |-- api/
|   |   |   \-- message-client.ts
|   |   |-- model/
|   |   |   \-- types.ts
|   |   \-- index.ts
|   \-- user/
|       |-- api/
|       |   |-- index.ts
|       |   |-- profile-client.ts
|       |   \-- sqlite-auth-envelope.ts
|       |-- model/
|       |   |-- offline-auth-envelope.ts
|       |   |-- offline-credentials.ts
|       |   |-- offline-passkey.ts
|       |   |-- profile-types.ts
|       |   |-- restore-session.ts
|       |   |-- session-cache-storage.ts
|       |   |-- session-cache.ts
|       |   |-- session-context.ts
|       |   |-- session-store.ts
|       |   \-- session-types.ts
|       |-- ui/
|       |   \-- profile-summary-card.tsx
|       \-- index.ts
|-- features/
|   |-- admin-management/
|   |   |-- model/
|   |   |   |-- use-access-code-form.ts
|   |   |   |-- use-access-codes.ts
|   |   |   |-- use-market-form.ts
|   |   |   \-- use-market-locations.ts
|   |   \-- index.ts
|   |-- assistant/
|   |   |-- model/
|   |   |   \-- use-assistant.ts
|   |   \-- index.ts
|   |-- auth/
|   |   |-- api/
|   |   |   |-- auth-client.ts
|   |   |   \-- index.ts
|   |   |-- model/
|   |   |   |-- forgot-password.ts
|   |   |   |-- login.ts
|   |   |   |-- recovery-types.ts
|   |   |   |-- reset-password.ts
|   |   |   |-- signup.ts
|   |   |   |-- use-forgot-password.ts
|   |   |   |-- use-login.ts
|   |   |   |-- use-reset-password.ts
|   |   |   \-- use-signup.ts
|   |   |-- ui/
|   |   |   \-- inactivity-guard.tsx
|   |   \-- index.ts
|   |-- developer-tools/
|   |   |-- api/
|   |   |   \-- developer-options-client.ts
|   |   |-- lib/
|   |   |   \-- in-app-metrics.ts
|   |   |-- model/
|   |   |   |-- api-docs-catalog.ts
|   |   |   |-- api-docs-curl.ts
|   |   |   |-- api-docs-history.ts
|   |   |   |-- api-docs-redaction.ts
|   |   |   |-- api-docs-request.ts
|   |   |   |-- api-docs-response.ts
|   |   |   |-- api-docs-types.ts
|   |   |   |-- developer-options-storage.ts
|   |   |   |-- types.ts
|   |   |   |-- use-api-docs.ts
|   |   |   \-- use-developer-dashboard.ts
|   |   |-- ui/
|   |   |   |-- api-docs/
|   |   |   |   |-- api-docs-section.tsx
|   |   |   |   |-- category-nav.tsx
|   |   |   |   |-- history-panel.tsx
|   |   |   |   |-- request-panel.tsx
|   |   |   |   \-- response-panel.tsx
|   |   |   |-- datasets-section.tsx
|   |   |   |-- developer-export.tsx
|   |   |   |-- developer-metrics.tsx
|   |   |   |-- developer-options-panel.tsx
|   |   |   \-- training-section.tsx
|   |   \-- index.ts
|   |-- inspection-capture/
|   |   |-- lib/
|   |   |   |-- capture-quality.ts
|   |   |   |-- controls.ts
|   |   |   |-- image-quality.ts
|   |   |   \-- quality.ts
|   |   |-- model/
|   |   |   |-- camera-constants.ts
|   |   |   |-- camera-device.ts
|   |   |   |-- camera-session.ts
|   |   |   \-- types.ts
|   |   |-- ui/
|   |   |   |-- camera-capture-view.tsx
|   |   |   \-- camera-capture.tsx
|   |   \-- index.ts
|   |-- inspection-history/
|   |   |-- model/
|   |   |   \-- use-inspections.ts
|   |   \-- index.ts
|   |-- inspection-submission/
|   |   |-- api/
|   |   |   \-- upload-client.ts
|   |   |-- model/
|   |   |   \-- use-submit-inspection.ts
|   |   \-- index.ts
|   |-- messaging/
|   |   |-- lib/
|   |   |   \-- formatters.ts
|   |   |-- model/
|   |   |   |-- types.ts
|   |   |   |-- use-messages.ts
|   |   |   \-- view-state.ts
|   |   \-- index.ts
|   |-- offline-analysis/
|   |   |-- api/
|   |   |   \-- analyze-inspection.ts
|   |   |-- lib/
|   |   |   |-- analysis-runtime.ts
|   |   |   |-- classification.ts
|   |   |   |-- ensemble.ts
|   |   |   |-- freshness-score.ts
|   |   |   |-- image-crop.ts
|   |   |   |-- image-input.ts
|   |   |   |-- mask-morphology.ts
|   |   |   |-- meat-lens-pipeline.ts
|   |   |   |-- mobilenet-runtime.ts
|   |   |   |-- mobilenet-session.ts
|   |   |   |-- mobilenet.ts
|   |   |   |-- model-explanation.ts
|   |   |   |-- resnet-runtime.ts
|   |   |   |-- resnet-session.ts
|   |   |   |-- roi-segmentation.ts
|   |   |   \-- tensor-data.ts
|   |   \-- index.ts
|   |-- offline-sync/
|   |   |-- api/
|   |   |   |-- index.ts
|   |   |   |-- sqlite-audit-queue.ts
|   |   |   \-- sqlite-offline-queue.ts
|   |   |-- model/
|   |   |   |-- audit-queue.ts
|   |   |   \-- inspection-queue.ts
|   |   |-- ui/
|   |   |   \-- offline-sync-manager.tsx
|   |   \-- index.ts
|   |-- onboarding/
|   |   |-- lib/
|   |   |   \-- onboarding-copy.ts
|   |   |-- model/
|   |   |   |-- session.ts
|   |   |   |-- types.ts
|   |   |   \-- use-onboarding.ts
|   |   |-- ui/
|   |   |   \-- onboarding-page.tsx
|   |   \-- index.ts
|   |-- passkeys/
|   |   |-- api/
|   |   |   |-- index.ts
|   |   |   \-- passkey-client.ts
|   |   |-- lib/
|   |   |   |-- browser.ts
|   |   |   \-- local-unlock.ts
|   |   |-- model/
|   |   |   \-- local-passkey-storage.ts
|   |   \-- index.ts
|   |-- profile-editing/
|   |   |-- model/
|   |   |   |-- profile-page.ts
|   |   |   \-- use-profile-editor.ts
|   |   |-- ui/
|   |   |   \-- editable-details-card.tsx
|   |   \-- index.ts
|   |-- public-landing/
|   |   |-- model/
|   |   |   \-- use-landing-stats.ts
|   |   \-- index.ts
|   |-- reports/
|   |   |-- api/
|   |   |   \-- generate-report.ts
|   |   |-- lib/
|   |   |   |-- adapters/
|   |   |   |   |-- admin-range-report.ts
|   |   |   |   \-- inspector-daily-report.ts
|   |   |   |-- pdf/
|   |   |   |   |-- assets.ts
|   |   |   |   |-- build-doc-definition.ts
|   |   |   |   |-- document-header.ts
|   |   |   |   |-- document-sections.ts
|   |   |   |   |-- report-charts.ts
|   |   |   |   \-- runtime.ts
|   |   |   |-- templates/
|   |   |   |   |-- adminSectionOrder.ts
|   |   |   |   |-- cityVetTemplate.ts
|   |   |   |   |-- dtiTemplate.ts
|   |   |   |   |-- gcccsTemplate.ts
|   |   |   |   \-- index.ts
|   |   |   |-- formatting.ts
|   |   |   |-- letterheads.ts
|   |   |   |-- meat-sections.ts
|   |   |   \-- page-frames.ts
|   |   |-- model/
|   |   |   |-- organizations.ts
|   |   |   |-- types.ts
|   |   |   |-- use-admin-report.ts
|   |   |   \-- use-reports-tab.ts
|   |   \-- index.ts
|   \-- tutorials/
|       |-- model/
|       |   |-- inspection-tutorial.ts
|       |   |-- profile-tutorial-page-types.ts
|       |   |-- profile-tutorial-page.ts
|       |   |-- profile-tutorial.ts
|       |   |-- use-profile-help-page.ts
|       |   \-- use-profile-tutorial-page.ts
|       |-- ui/
|       |   |-- scenes/
|       |   |   |-- history-mock-scene.tsx
|       |   |   |-- inspect-mock-scene.tsx
|       |   |   |-- profile-mock-scene.tsx
|       |   |   \-- safety-mock-scene.tsx
|       |   |-- mock-hotspot.tsx
|       |   |-- mock-phone-frame.tsx
|       |   |-- profile-help-page-view.tsx
|       |   |-- profile-tutorial-page-view.tsx
|       |   |-- tutorial-player.tsx
|       |   \-- tutorial-scene.tsx
|       \-- index.ts
|-- pages/
|   |-- admin/
|   |   |-- admin-dashboard-page.tsx
|   |   |-- admin-dashboard-wrapper.tsx
|   |   \-- desktop-admin-dashboard-page.tsx
|   |-- auth/
|   |   |-- components/
|   |   |   |-- forgot-password-page-view.tsx
|   |   |   |-- login-page-view.tsx
|   |   |   |-- reset-password-page-view.tsx
|   |   |   \-- signup-page-view.tsx
|   |   |-- forgot-password-page.tsx
|   |   |-- index.ts
|   |   |-- login-page.tsx
|   |   |-- reset-password-page.tsx
|   |   \-- signup-page.tsx
|   |-- inspector/
|   |   |-- history-page.tsx
|   |   |-- inspect-page.tsx
|   |   |-- messages-page.tsx
|   |   |-- onboarding-page.tsx
|   |   |-- profile-help-page.tsx
|   |   |-- profile-help-scope-page.tsx
|   |   |-- profile-page.tsx
|   |   \-- profile-tutorial-page.tsx
|   |-- not-found/
|   |   |-- components/
|   |   |   \-- NotFoundPageView.tsx
|   |   |-- hooks/
|   |   |   \-- useNotFoundPage.ts
|   |   |-- utils/
|   |   |   \-- notFoundPage.ts
|   |   |-- NotFound.tsx
|   |   \-- types.ts
|   \-- public/
|       \-- landing-page.tsx
|-- shared/
|   |-- api/
|   |   |-- api-error.ts
|   |   |-- auth-headers.ts
|   |   |-- auth-recovery.ts
|   |   |-- base-url.ts
|   |   |-- fetch-with-timeout.ts
|   |   |-- index.ts
|   |   \-- request.ts
|   |-- config/
|   |   |-- demo-mode.ts
|   |   \-- env.ts
|   |-- hooks/
|   |   |-- use-desktop.ts
|   |   \-- use-mobile.ts
|   |-- lib/
|   |   |-- confidence-level.ts
|   |   |-- date-time.ts
|   |   |-- storage.ts
|   |   |-- theme-preference.ts
|   |   \-- utils.ts
|   |-- platform/
|   |   \-- sqlite/
|   |       |-- database.ts
|   |       \-- index.ts
|   \-- ui/
|       |-- sidebar/
|       |   |-- index.ts
|       |   |-- sidebar-layout.tsx
|       |   |-- sidebar-menu.tsx
|       |   \-- sidebar-provider.tsx
|       |-- accordion.tsx
|       |-- alert-dialog.tsx
|       |-- alert.tsx
|       |-- aspect-ratio.tsx
|       |-- avatar.tsx
|       |-- badge.tsx
|       |-- breadcrumb.tsx
|       |-- button.tsx
|       |-- calendar.tsx
|       |-- card.tsx
|       |-- carousel.tsx
|       |-- chart.tsx
|       |-- checkbox.tsx
|       |-- collapsible.tsx
|       |-- command.tsx
|       |-- confirm-dialog.tsx
|       |-- context-menu.tsx
|       |-- dialog.tsx
|       |-- drawer.tsx
|       |-- dropdown-menu.tsx
|       |-- form.tsx
|       |-- hover-card.tsx
|       |-- index.ts
|       |-- input-otp.tsx
|       |-- input.tsx
|       |-- label.tsx
|       |-- menubar.tsx
|       |-- metric-card.tsx
|       |-- nav-link.tsx
|       |-- navigation-menu.tsx
|       |-- network-loading-screen.tsx
|       |-- page-header.tsx
|       |-- pagination.tsx
|       |-- popover.tsx
|       |-- progress.tsx
|       |-- radio-group.tsx
|       |-- resizable.tsx
|       |-- scroll-area.tsx
|       |-- select.tsx
|       |-- separator.tsx
|       |-- sheet.tsx
|       |-- skeleton.tsx
|       |-- slider.tsx
|       |-- SmartPagination.tsx
|       |-- sonner.tsx
|       |-- switch.tsx
|       |-- table.tsx
|       |-- tabs.tsx
|       |-- textarea.tsx
|       |-- toast.tsx
|       |-- toaster.tsx
|       |-- toggle-group.tsx
|       |-- toggle.tsx
|       |-- tooltip.tsx
|       \-- use-toast.ts
|-- test/
|   \-- setup.ts
|-- widgets/
|   |-- admin-dashboard/
|   |   |-- lib/
|   |   |   \-- dashboard.ts
|   |   |-- model/
|   |   |   |-- types.ts
|   |   |   |-- use-admin-dashboard.ts
|   |   |   |-- use-dashboard-analytics.ts
|   |   |   |-- use-dashboard-report.ts
|   |   |   |-- use-dashboard-session.ts
|   |   |   |-- use-inspection-pagination.ts
|   |   |   |-- use-inspections-tab.ts
|   |   |   |-- use-log-filters.ts
|   |   |   |-- use-logs-tab.ts
|   |   |   |-- use-overview-tab.ts
|   |   |   |-- use-user-actions.ts
|   |   |   \-- use-users-tab.ts
|   |   |-- ui/
|   |   |   |-- overview/
|   |   |   |   |-- inspection-chart.tsx
|   |   |   |   |-- overview-tab.tsx
|   |   |   |   \-- summary-cards.tsx
|   |   |   |-- users/
|   |   |   |   |-- user-actions.tsx
|   |   |   |   |-- user-table.tsx
|   |   |   |   \-- users-tab.tsx
|   |   |   |-- access-codes-tab.tsx
|   |   |   |-- admin-dashboard-dialogs.tsx
|   |   |   |-- admin-dashboard-summary.tsx
|   |   |   |-- desktop-access-codes-tab.tsx
|   |   |   |-- desktop-admin-dashboard.tsx
|   |   |   |-- desktop-developer-tab.tsx
|   |   |   |-- desktop-inspections-tab.tsx
|   |   |   |-- desktop-logs-tab.tsx
|   |   |   |-- desktop-markets-tab.tsx
|   |   |   |-- desktop-overview-tab.tsx
|   |   |   |-- desktop-reports-tab.tsx
|   |   |   |-- desktop-users-tab.tsx
|   |   |   |-- developer-tab-content.tsx
|   |   |   |-- inspections-tab.tsx
|   |   |   |-- logs-tab.tsx
|   |   |   |-- markets-tab.tsx
|   |   |   |-- mobile-access-codes-tab.tsx
|   |   |   |-- mobile-admin-dashboard.tsx
|   |   |   |-- mobile-developer-tab.tsx
|   |   |   |-- mobile-inspections-tab.tsx
|   |   |   |-- mobile-logs-tab.tsx
|   |   |   |-- mobile-markets-tab.tsx
|   |   |   |-- mobile-overview-tab.tsx
|   |   |   |-- mobile-reports-dashboard-tab.tsx
|   |   |   |-- mobile-reports-tab.tsx
|   |   |   |-- mobile-users-tab.tsx
|   |   |   \-- reports-tab.tsx
|   |   \-- index.ts
|   |-- assistant/
|   |   |-- assistant-widget.tsx
|   |   \-- index.ts
|   |-- history/
|   |   |-- model/
|   |   |   |-- history-page.ts
|   |   |   |-- types.ts
|   |   |   \-- use-history.ts
|   |   |-- ui/
|   |   |   |-- history-header.tsx
|   |   |   |-- history-sidebar.tsx
|   |   |   \-- inspection-timeline-section.tsx
|   |   \-- index.ts
|   |-- inspection-history/
|   |   |-- ui/
|   |   |   \-- inspection-detail-sheet.tsx
|   |   \-- index.ts
|   |-- inspection-workspace/
|   |   |-- model/
|   |   |   |-- inspect-page.ts
|   |   |   |-- types.ts
|   |   |   |-- use-inspection-analysis.ts
|   |   |   \-- use-inspection-workspace.ts
|   |   \-- ui/
|   |       |-- InspectActionsSection.tsx
|   |       |-- InspectAnalysisSection.tsx
|   |       |-- InspectCaptureSection.tsx
|   |       |-- InspectHeroSection.tsx
|   |       |-- inspection-workspace.tsx
|   |       |-- InspectPreScanSection.tsx
|   |       \-- InspectScopeReminder.tsx
|   |-- legal/
|   |   |-- index.ts
|   |   |-- privacy-policy-content.tsx
|   |   |-- privacy-policy-dialog.tsx
|   |   |-- scope-delimitations-content.tsx
|   |   |-- scope-reference.ts
|   |   |-- terms-and-conditions-dialog.tsx
|   |   \-- terms-content.tsx
|   |-- messages/
|   |   |-- contacts-panel.tsx
|   |   |-- index.ts
|   |   |-- messages-header.tsx
|   |   \-- thread-panel.tsx
|   |-- navigation/
|   |   |-- bottom-nav.tsx
|   |   |-- index.ts
|   |   \-- offline-banner.tsx
|   |-- profile/
|   |   |-- profile-page-header.tsx
|   |   |-- profile-primary-column.tsx
|   |   |-- profile-secondary-column.tsx
|   |   \-- profile-widget.tsx
|   \-- public-landing/
|       |-- lib/
|       |   \-- landing-data.ts
|       |-- model/
|       |   |-- types.ts
|       |   \-- use-count-up.ts
|       |-- ui/
|       |   |-- animated-stat.tsx
|       |   |-- bottom-cta-section.tsx
|       |   |-- features-section.tsx
|       |   |-- hero-section.tsx
|       |   |-- landing-footer.tsx
|       |   |-- landing-header.tsx
|       |   |-- log-ticker.tsx
|       |   |-- simulator.tsx
|       |   |-- testimonials-section.tsx
|       |   \-- workflow-section.tsx
|       \-- index.ts
|-- main.tsx
\-- vite-env.d.ts
```

## tests/ - Test Suite

Tests mirror the architectural boundaries and enforce behavior, ownership, public APIs, dependency boundaries, source-size limits, and end-to-end journeys.

```text
tests/
|-- component/
|   |-- analysis/
|   |   \-- analysis-result-card.component.test.tsx
|   |-- developer/
|   |   |-- api-docs-category-nav.component.test.tsx
|   |   |-- api-docs-history-panel.component.test.tsx
|   |   |-- api-docs-request-panel.component.test.tsx
|   |   \-- api-docs-response-panel.component.test.tsx
|   |-- inspections/
|   |   \-- inspection-list-item.component.test.tsx
|   \-- shared/
|       \-- terms-and-conditions.component.test.tsx
|-- e2e/
|   |-- journeys/
|   |   |-- administrator/
|   |   |   \-- admin-dashboard.e2e.spec.ts
|   |   |-- developer/
|   |   |   \-- developer-options.e2e.spec.ts
|   |   \-- inspector/
|   |       |-- ai-chatbot.e2e.spec.ts
|   |       |-- camera-capture.e2e.spec.ts
|   |       |-- camera-quality.e2e.spec.ts
|   |       |-- capture-quality.e2e.spec.ts
|   |       |-- image-quality.e2e.spec.ts
|   |       |-- inspect-page.e2e.spec.ts
|   |       |-- inspector-onboarding.e2e.spec.ts
|   |       |-- meatlens-pipeline.e2e.spec.ts
|   |       |-- messages-page.e2e.spec.ts
|   |       |-- passkey-auth.e2e.spec.ts
|   |       |-- profile-help.e2e.spec.ts
|   |       |-- profile-page.e2e.spec.ts
|   |       |-- terms-and-conditions.e2e.spec.ts
|   |       \-- use-inspections.e2e.spec.ts
|   |-- offline/
|   |   |-- offline-analysis.e2e.spec.ts
|   |   |-- offline-ensemble.e2e.spec.ts
|   |   \-- offline-passkey-unlock.e2e.spec.ts
|   |-- security/
|   |   \-- auth-token-url-sanitization.e2e.spec.ts
|   \-- smoke/
|       |-- example.e2e.spec.ts
|       |-- legacy-route-contract.e2e.spec.ts
|       \-- not-found.e2e.spec.ts
|-- integration/
|   |-- api/
|   |   |-- inspection-client.integration.test.ts
|   |   |-- profile-client.integration.test.ts
|   |   \-- user-chat-client.integration.test.ts
|   |-- camera/
|   |   \-- camera-quality.integration.test.tsx
|   \-- offline/
|       \-- offline-analysis-explanation.integration.test.ts
|-- support/
|   |-- api/
|   |   \-- .gitkeep
|   |-- auth/
|   |   \-- .gitkeep
|   |-- factories/
|   |   \-- image.ts
|   |-- fixtures/
|   |   \-- app.ts
|   \-- page-objects/
|       \-- .gitkeep
\-- unit/
    |-- app/
    |   |-- admin-route.unit.test.tsx
    |   |-- app-entry.unit.test.ts
    |   |-- app-layout.unit.test.tsx
    |   |-- app-router.unit.test.tsx
    |   |-- network-provider.unit.test.tsx
    |   |-- notification-provider.unit.test.tsx
    |   |-- onboarding-route.unit.test.tsx
    |   |-- protected-route.unit.test.tsx
    |   |-- public-layout.unit.test.tsx
    |   |-- query-client.unit.test.ts
    |   |-- query-provider.unit.test.tsx
    |   |-- route-paths.unit.test.ts
    |   \-- theme-controller.unit.test.ts
    |-- architecture/
    |   |-- app-global-styles.unit.test.ts
    |   |-- component-ownership.unit.test.ts
    |   |-- final-fsd-audit.unit.test.ts
    |   |-- foundation-boundaries.unit.test.ts
    |   \-- public-api.unit.test.ts
    |-- developer/
    |   |-- api-docs-catalog.unit.test.ts
    |   |-- api-docs-history.unit.test.ts
    |   |-- api-docs-hook.unit.test.tsx
    |   |-- api-docs-request.unit.test.ts
    |   |-- api-docs-response.unit.test.ts
    |   \-- api-docs-route-audit.unit.test.ts
    |-- domain/
    |   |-- analysis/
    |   |   |-- admin-range-report-adapter.unit.test.ts
    |   |   |-- admin-report-pdf-export.unit.test.ts
    |   |   |-- admin-report-protocol.unit.test.ts
    |   |   |-- admin-report-templates.unit.test.ts
    |   |   |-- history-report-pdf-export.unit.test.ts
    |   |   |-- inspector-daily-charts.unit.test.ts
    |   |   |-- inspector-daily-report-adapter.unit.test.ts
    |   |   |-- inspector-pdf-chart-svg.unit.test.ts
    |   |   |-- inspector-report-templates.unit.test.ts
    |   |   |-- report-letterhead-assets.unit.test.ts
    |   |   |-- report-letterheads.unit.test.ts
    |   |   |-- report-pdf-doc-definition.unit.test.ts
    |   |   |-- report-pdf-runtime.unit.test.ts
    |   |   \-- report-template-selection.unit.test.ts
    |   |-- auth/
    |   |   |-- local-passkey-auth.unit.test.ts
    |   |   \-- security-auth-clients.unit.test.tsx
    |   |-- image-quality/
    |   |   \-- camera-quality.unit.test.ts
    |   \-- inspections/
    |       |-- inspection-location.unit.test.ts
    |       \-- inspection-pre-scan.unit.test.ts
    |-- entities/
    |   |-- access-code/
    |   |   \-- access-code-public-api.unit.test.ts
    |   |-- audit-log/
    |   |   \-- audit-log-public-api.unit.test.ts
    |   |-- developer-metrics/
    |   |   \-- developer-metrics-public-api.unit.test.ts
    |   |-- inspection/
    |   |   |-- domain-types.unit.test.ts
    |   |   |-- query-keys.unit.test.ts
    |   |   \-- sqlite-cache.unit.test.ts
    |   |-- market-location/
    |   |   \-- market-location-public-api.unit.test.ts
    |   |-- message/
    |   |   \-- message-public-api.unit.test.ts
    |   \-- user/
    |       |-- offline-envelope.unit.test.ts
    |       |-- profile-types.unit.test.ts
    |       |-- session-cache.unit.test.ts
    |       |-- session-restoration.unit.test.ts
    |       \-- session-types.unit.test.ts
    |-- features/
    |   |-- admin-management/
    |   |   |-- access-code-state.unit.test.ts
    |   |   \-- market-state.unit.test.ts
    |   |-- assistant/
    |   |   \-- assistant-model.unit.test.ts
    |   |-- auth/
    |   |   |-- forgot-password-workflow.unit.test.ts
    |   |   |-- inactivity-guard.unit.test.tsx
    |   |   |-- login-workflow.unit.test.ts
    |   |   |-- reset-password-workflow.unit.test.ts
    |   |   \-- signup-workflow.unit.test.ts
    |   |-- developer-tools/
    |   |   |-- api-docs-flow.unit.test.ts
    |   |   |-- api-docs-model.unit.test.ts
    |   |   |-- api-docs-ui.unit.test.ts
    |   |   |-- developer-data-ui.unit.test.ts
    |   |   |-- developer-options-public-api.unit.test.ts
    |   |   \-- developer-ui.unit.test.ts
    |   |-- history/
    |   |   \-- history-page.unit.test.tsx
    |   |-- inspection-capture/
    |   |   |-- camera-session.unit.test.ts
    |   |   \-- inspection-capture-public-api.unit.test.ts
    |   |-- inspection-history/
    |   |   \-- inspection-history-public-api.unit.test.ts
    |   |-- inspection-submission/
    |   |   |-- inspection-mutation.unit.test.ts
    |   |   \-- upload-client-public-api.unit.test.ts
    |   |-- inspection-workspace/
    |   |   |-- inspection-analysis.unit.test.ts
    |   |   \-- inspection-page.unit.test.tsx
    |   |-- messaging/
    |   |   |-- message-workflow.unit.test.ts
    |   |   \-- messages-page.unit.test.tsx
    |   |-- offline-analysis/
    |   |   |-- freshness-score.unit.test.ts
    |   |   |-- image-geometry.unit.test.ts
    |   |   |-- mask-morphology.unit.test.ts
    |   |   |-- mobilenet-public-api.unit.test.ts
    |   |   |-- mobilenet-session.unit.test.ts
    |   |   |-- public-api.unit.test.ts
    |   |   |-- resnet-session.unit.test.ts
    |   |   \-- tensor-classification.unit.test.ts
    |   |-- offline-sync/
    |   |   |-- audit-queue-contract.unit.test.ts
    |   |   |-- offline-queue-contract.unit.test.ts
    |   |   |-- offline-sync-manager.unit.test.ts
    |   |   \-- sqlite-queue-adapter.unit.test.ts
    |   |-- onboarding/
    |   |   |-- onboarding-page.unit.test.tsx
    |   |   \-- onboarding-session.unit.test.ts
    |   |-- passkeys/
    |   |   \-- browser.unit.test.ts
    |   |-- profile-editing/
    |   |   |-- profile-page.unit.test.tsx
    |   |   |-- profile-secondary-ui.unit.test.tsx
    |   |   |-- profile-ui.unit.test.tsx
    |   |   \-- public-api.unit.test.ts
    |   |-- public-landing/
    |   |   \-- public-landing-ownership.unit.test.tsx
    |   |-- reports/
    |   |   |-- admin-report-state.unit.test.ts
    |   |   |-- document-header.unit.test.ts
    |   |   |-- public-api.unit.test.ts
    |   |   |-- report-chart-generation.unit.test.ts
    |   |   |-- report-formatting.unit.test.ts
    |   |   \-- reports-public-api.unit.test.ts
    |   \-- tutorials/
    |       |-- profile-help-routes.unit.test.tsx
    |       |-- profile-page-public-api.unit.test.ts
    |       |-- profile-tutorial-route.unit.test.tsx
    |       |-- tutorial-model.unit.test.ts
    |       \-- tutorial-player.unit.test.tsx
    |-- hooks/
    |   |-- admin-dashboard-summary.unit.test.tsx
    |   |-- admin-inspections-pagination.unit.test.tsx
    |   |-- camera-view.unit.test.tsx
    |   |-- history-page-filter.unit.test.ts
    |   |-- password-input-toggle.unit.test.tsx
    |   \-- use-desktop.unit.test.tsx
    |-- pages/
    |   |-- admin-route-pages.unit.test.ts
    |   |-- auth-recovery-route-pages.unit.test.tsx
    |   \-- auth-route-pages.unit.test.tsx
    |-- state/
    |   |-- auth-context-offline.unit.test.tsx
    |   |-- auth-context-session-cleanup.unit.test.tsx
    |   |-- developer-dashboard-role-gating.unit.test.tsx
    |   |-- developer-dashboard-workspace.unit.test.tsx
    |   |-- developer-role-auth.unit.test.tsx
    |   |-- messages-view-state.unit.test.ts
    |   \-- offline-auth-envelope.unit.test.ts
    |-- utilities/
    |   |-- api-base-url.unit.test.ts
    |   |-- api-error.unit.test.ts
    |   |-- api-request-timeouts.unit.test.ts
    |   |-- camera-controls.unit.test.ts
    |   |-- developer-dashboard-export-timeout.unit.test.ts
    |   |-- shared-date-storage.unit.test.ts
    |   |-- shared-lib.unit.test.ts
    |   |-- shared-sidebar-public-api.unit.test.ts
    |   |-- shared-ui-dialog-form.unit.test.ts
    |   |-- shared-ui-maintained-public-api.unit.test.ts
    |   |-- shared-ui-primitives.unit.test.ts
    |   \-- sqlite-public-api.unit.test.ts
    \-- widgets/
        |-- admin-dashboard/
        |   |-- access-codes-ui.unit.test.ts
        |   |-- admin-shell-ui.unit.test.ts
        |   |-- dashboard-composition.unit.test.ts
        |   |-- dashboard-model.unit.test.ts
        |   |-- dashboard-session.unit.test.ts
        |   |-- inspection-state.unit.test.ts
        |   |-- inspections-ui.unit.test.ts
        |   |-- log-state.unit.test.ts
        |   |-- logs-ui.unit.test.ts
        |   |-- markets-ui.unit.test.ts
        |   |-- overview-tab.unit.test.ts
        |   |-- overview-ui.unit.test.ts
        |   |-- reports-ui.unit.test.ts
        |   |-- user-state.unit.test.ts
        |   |-- users-tab.unit.test.ts
        |   \-- users-ui.unit.test.ts
        |-- assistant/
        |   \-- assistant-widget.unit.test.tsx
        |-- history/
        |   \-- history-public-api.unit.test.ts
        |-- messages/
        |   \-- thread-panel.unit.test.tsx
        \-- navigation/
            |-- bottom-nav.unit.test.tsx
            \-- offline-banner.unit.test.tsx
```

## scripts/ - Architecture and Build Checks

```text
scripts/
|-- check-fsd-boundaries.mjs
|-- check-fsd-boundaries.test.mjs
|-- check-source-size.mjs
|-- check-source-size.test.mjs
\-- package-validation.test.mjs
```

The boundary check enforces the FSD layer rules and legacy-owner prohibition. The source-size check enforces the 600-LOC hard limit and flags files at the 450-LOC split-review threshold.

## public/ - Static Runtime Assets

```text
public/
|-- letterheads/
|   |-- rendered/
|   |   |-- city-vet-page.png
|   |   |-- dti-page.png
|   |   \-- gcccs-page.png
|   |-- City Vet letterhead.pdf
|   |-- DTI zambales letterhead.pdf
|   |-- gcccs letterhead new.pdf
|   \-- GCCCS letterhead.pdf
|-- model/
|   |-- model2/
|   |   |-- meatlens_final_8samples_cnn_only_mobilenetv3small_seed123_metadata.json
|   |   \-- meatlens_final_8samples_cnn_only_mobilenetv3small_seed123.onnx
|   |-- NEW-meatlens_best_model_metadata.json
|   \-- NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only.onnx
|-- model-old/
|   |-- model2/
|   |   |-- meatlens_final_8samples_cnn_only_mobilenetv3small_seed123_metadata.json
|   |   \-- meatlens_final_8samples_cnn_only_mobilenetv3small_seed123.onnx
|   |-- meatlens_best_model_metadata.json
|   |-- meatlens_mobilenetv3small_cnn_only.onnx
|   |-- meatlens_resnet50_exp2.onnx
|   |-- NEW-meatlens_best_model_metadata.json
|   |-- NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only.onnx
|   \-- README.txt
|-- models/
|   |-- mobilenetv3_meat/
|   |   |-- meatlens_mobilenetv3small_cnn_only.onnx
|   |   |-- meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata (1).json
|   |   |-- NEW-meatlens_best_model_metadata.json
|   |   |-- NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only.onnx
|   |   \-- README.txt
|   \-- resnet50_meat/
|       |-- meatlens_resnet50_exp2.onnx
|       \-- README.txt
|-- ort/
|   |-- ort-wasm-simd-threaded.asyncify.mjs
|   |-- ort-wasm-simd-threaded.asyncify.wasm
|   |-- ort-wasm-simd-threaded.jsep.mjs
|   |-- ort-wasm-simd-threaded.jsep.wasm
|   |-- ort-wasm-simd-threaded.jspi.mjs
|   |-- ort-wasm-simd-threaded.jspi.wasm
|   |-- ort-wasm-simd-threaded.mjs
|   \-- ort-wasm-simd-threaded.wasm
|-- android-chrome-192x192.png
|-- android-chrome-512x512.png
|-- apple-touch-icon.png
|-- favicon.ico
\-- robots.txt
```

Public model files and ONNX runtime assets are runtime inputs, not application modules. They must be accessed through the owning feature/model adapters rather than imported into unrelated slices.

## Architectural Rules

1. Keep route registration and providers in `src/app`; keep route screens in `src/pages`.
2. Keep reusable page-scale composition in `src/widgets`; keep a user intent or workflow in `src/features`.
3. Keep business concepts and their API/cache contracts in `src/entities`.
4. Keep generic primitives and cross-cutting adapters in `src/shared`; do not use it as a dumping ground for business-specific behavior.
5. Import across slices through public APIs where a slice exposes one; do not reach into another slice's private implementation directories.
6. Do not recreate the retired root-level `components/`, `contexts/`, `hooks/`, `integrations/`, `lib/`, `types/`, or monolithic `App.tsx` ownership model.
7. Use React composition for UI and stateful hooks. Use classes only where an object with an explicit lifecycle or invariant benefits from OOP; do not introduce classes solely to make React code look object-oriented.
8. Keep files below the project hard limit of 600 lines and treat 450 lines as the split-review threshold. Split by responsibility before a file becomes a god class or god module.
9. Add or update a focused test with each structural change, then run the relevant unit, component, integration, architecture, typecheck, lint, build, and critical E2E gates as applicable.



