# Admin Organization-Specific Graphs and Pork PDF Design

## Summary

Refine the admin PDF export so it does more than reuse the same summary-and-table body for every organization. Admin reports must keep the real frontend PDF pipeline, but they now need organization-specific section ordering plus graph and evidence behavior that matches each organization's role.

All organizations must receive graphs in the admin PDF. DTI and City Veterinary Office admin PDFs must also include the real pork meat images themselves, using all pork captures in the selected date range that have real unsegmented `image_url` data. GCCCS remains technical-first and does not receive the pork gallery section.

This design is a follow-up to:

- `docs/superpowers/specs/2026-08-01-org-specific-real-pdf-reports-design.md`
- `docs/superpowers/specs/2026-08-03-inspector-org-specific-photo-pdf-design.md`

Those designs established the real frontend PDF system and the inspector photo-first evidence path. This design narrows in on the remaining admin-export gap.

## Problem Statement

The current admin PDF export still falls short of the approved report direction:

- the report model does not carry graph-specific content into the PDF builder
- the admin PDF structure is still mostly metrics plus tables
- DTI and City Vet admin reports do not yet include the pork meat images themselves
- organization-specific ordering exists, but the report body still does not fully reflect each organization's role

The result is a usable PDF, but not yet the organization-specific admin document the user requested. It lacks the expected graph sections and, for DTI and City Vet, it lacks the pork evidence gallery that should appear alongside the admin reporting body.

## Approved Scope

This design covers admin PDF exports only.

It does not redesign inspector exports from scratch. Inspector organization-specific image behavior already exists and stays in place.

This design stays frontend-only and continues using the existing real PDF export pipeline.

## Product Rules

### Output rules

- Admin exports remain actual PDF files generated in the frontend.
- The existing organization letterhead/page-frame system remains in use.
- The report must remain document-like rather than a printed web view.

### Graph rules

- All admin PDFs must include graphs.
- The graph set is fixed for every organization:
  - classification breakdown
  - daily inspection trend
  - meat-type breakdown
- Graphs must be built from the already filtered real report data for the selected date range.
- If a graph has no usable data for the selected range, the graph section must remain present and show a plain no-data state instead of disappearing.

### Organization rules

- DTI and City Vet admin PDFs must include both graphs and pork meat images.
- GCCCS admin PDFs remain technical-first and do not include the pork gallery.
- Approved section order is:
  - DTI / City Vet: overview -> graphs -> pork gallery -> detailed meat report
  - GCCCS: technical overview -> graphs -> detailed meat report

### Pork evidence rules

- DTI and City Vet pork galleries include all pork captures in the selected date range that have a real unsegmented `image_url`.
- Ordering is newest captured record first.
- Pork inspections without `image_url` remain in the detailed meat tables but do not produce fake image cards.
- If an image asset fails to load during PDF composition, the card must remain in the gallery with a plain unavailable-image state.

### Data rules

- Use only existing real report data already available in the frontend.
- Do not introduce new backend endpoints or placeholder metrics.
- Do not synthesize graph points or gallery records that do not exist in the filtered range.

## Existing Data Available Today

From the existing admin report export path, the frontend already has access to:

- selected report date range
- generated-at timestamp
- generated-by label
- report organization
- summary metrics:
  - total inspections
  - average confidence
  - spoiled rate
  - unique inspectors
  - unique locations
  - records with deviations
- report rows for the selected range
- for each report row:
  - `id`
  - `createdAt`
  - `capturedAt`
  - `inspector`
  - `inspectorEmail`
  - `inspectorCode`
  - `manualLocation`
  - `location`
  - `locationLatitude`
  - `locationLongitude`
  - `profileLocation`
  - `meatType`
  - `classification`
  - `confidenceScore`
  - `decisionSource`
  - `protocolSpoiledReason`
  - `stallNumber`
  - `certificateProof`
  - `meatExpiryDate`
  - `storageCorrect`
  - `lightColorCorrect`
  - `lightColorObserved`
  - `areaClean`
  - `flaggedDeviations`
  - `explanation`
  - `inspectorNotes`
  - `imageUrl`

No new data source is required for this change.

## Desired Report Direction

### Shared top-level admin shape

All admin PDFs still share a common high-level backbone:

1. organization-specific page frame
2. organization-specific opening section
3. graph section
4. optional pork gallery section for DTI and City Vet
5. detailed meat report section

The change is in how graph data and pork evidence are modeled and rendered.

### GCCCS admin report

GCCCS remains technical-first.

Its opening section should continue to read like a technical or system-oriented overview. After that, it receives the required graph section and then the detailed meat report section. It does not receive the pork image gallery.

### DTI admin report

DTI admin reports should read like market-service and operational oversight documents.

After the organization overview, the PDF must show the required graphs and then a pork evidence section that includes every pork capture in the filtered range with a real image URL. The detailed meat report still follows after the gallery.

### City Vet admin report

City Vet admin reports should read like veterinary and meat-safety oversight documents.

Like DTI, they receive the required graphs and then a pork evidence section containing every real pork capture in the filtered range. The detailed meat report follows after the gallery.

## Report Model Changes

The current admin report model is too narrow because it only supports:

- metrics
- detail rows
- plain tables

It does not support chart-ready content or admin pork evidence galleries.

The report model must be expanded to support:

- graph payloads as first-class report content
- pork gallery evidence items for admin reports
- organization-specific section ordering without creating a separate PDF stack per organization

This should be an additive model expansion inside the shared report domain.

## Adapter Changes

The admin report adapter must stop treating the PDF body as metrics plus one detail table only.

Instead, it should normalize the filtered report rows into:

- existing overview metrics
- chart-ready aggregates for:
  - classification breakdown
  - daily inspection trend
  - meat-type breakdown
- pork gallery evidence items for DTI and City Vet:
  - stable inspection identity
  - original unsegmented `imageUrl`
  - readable captured timestamp
  - inspector
  - location
  - classification
  - confidence label
- the existing detailed meat report rows

This keeps data shaping close to the adapter layer while leaving section naming and section order to the template layer.

## Template Changes

Admin templates must become responsible for placing the graph section and, where applicable, the pork gallery section.

Each organization template must be able to:

- rename the opening overview section appropriately
- keep the shared graph section in a stable slot
- include or exclude the pork gallery section
- enforce approved section order

The important rule is that pork gallery inclusion becomes real template behavior, not conditional rendering hidden inside the PDF builder.

## Graph Rendering Changes

Graphs should be rendered as PDF-specific assets built from normalized chart payloads in the frontend.

The implementation should not depend on screenshotting the live dashboard DOM.

### Required graph order

Graphs always appear in this order:

1. Classification Breakdown
2. Daily Inspection Trend
3. Meat Type Breakdown

### Graph presentation rules

- DTI and City Vet graphs should use color accents that visually fit their letterheads.
- GCCCS graphs should keep the more technical visual treatment already aligned to that report family.
- Graphs must remain readable inside the PDF and should not rely on the browser viewport.

### No-data rules

- If a graph's source data is empty for the selected range, render a plain `No data for selected range` state inside the graph section.
- The graph section itself must remain present even when all values are empty.

## Pork Gallery Rendering Changes

DTI and City Vet admin PDFs need a dedicated pork image section after the graphs.

### Pork gallery rules

- Include all pork inspections in the filtered range that have a real unsegmented `imageUrl`.
- Sort newest first using readable captured-time ordering.
- Allow the section to span multiple pages because the user explicitly chose to include all pork captures.

### Pork card layout rules

- Each pork record becomes one photo evidence card.
- The image must remain large enough to inspect rather than collapsing into tiny thumbnail cells.
- Each card must keep the photo and metadata together as one visual unit whenever reasonable.
- The card metadata should include:
  - captured time
  - inspector
  - location
  - classification
  - confidence

### Missing or broken image rules

- If a pork row has no `imageUrl`, do not create a gallery card.
- If a pork row has an `imageUrl` but the asset fails to load, keep the card and render a plain unavailable-image state.
- Export must continue even when one or more images fail.

## PDF Rendering Changes

The shared PDF builder must learn how to render:

- graph sections
- no-data graph states
- admin pork gallery evidence cards

The existing detailed meat report tables remain the final section for every organization.

### Pagination rules

- Graphs should break between graph blocks rather than in the middle of one graph whenever reasonable.
- Each pork evidence card should remain unbreakable so the image and metadata do not split awkwardly across pages.
- Long pork galleries may span multiple pages.
- Detailed meat tables still need normal table pagination behavior after the gallery section.

## Architecture Direction

Keep the existing real-PDF frontend architecture and extend it in place:

- `frontend/src/lib/reports/adapters/adminRangeReport.ts`
  - expand normalized admin graph and pork-gallery data
- `frontend/src/lib/reports/types.ts`
  - add graph-capable and pork-gallery-capable report content support
- `frontend/src/lib/reports/templates/`
  - add real admin section ordering behavior per organization
- `frontend/src/lib/reports/pdf/buildDocDefinition.ts`
  - render graph sections, no-data states, and pork gallery cards
- `frontend/src/pages/admin-dashboard/utils/adminDashboard.ts`
  - preserve the filtered row fields needed by the adapter

This remains one shared PDF engine, not separate ad-hoc PDF builders per organization.

## Testing and Verification

### Functional verification

- Unit test admin report model building for:
  - graph payload generation from filtered report rows
  - DTI and City Vet pork gallery inclusion
  - GCCCS pork gallery exclusion
- Unit test organization-specific section order for admin reports.
- Unit test that graph sections remain present when the selected range is empty.
- Unit test that pork gallery cards distinguish missing-image and unavailable-image states.

### Visual verification

Rendered PDF QA is required because layout is part of the requirement.

Verification must include:

- generated DTI admin PDF with graphs and pork gallery cards
- generated City Vet admin PDF with graphs and pork gallery cards
- generated GCCCS admin PDF with graphs and no pork gallery
- inspection of gallery pagination to confirm cards stay readable
- inspection of no-data graph states

## Non-goals

This design does not include:

- redesigning inspector exports again
- inventing new backend metrics
- fabricating pork image cards when no real image exists
- screenshotting the live dashboard UI as the export source of truth
- moving PDF generation to the backend

## Acceptance Criteria

This design is successful when:

- all admin exports remain real frontend-generated PDF files
- all organizations receive the required graph set
- DTI and City Vet admin PDFs include all real pork captures in the selected range that have usable image URLs
- GCCCS admin PDFs remain technical-first and do not include the pork gallery
- DTI / City Vet section order is overview -> graphs -> pork gallery -> detailed meat report
- GCCCS section order is technical overview -> graphs -> detailed meat report
- empty graph data shows a clear no-data state instead of removing the graph section
- broken image assets fail gracefully without aborting PDF export
- only existing real data is used
