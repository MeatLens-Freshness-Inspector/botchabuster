# Inspector Organization-Specific Photo PDF Design

## Summary

Refine the inspector PDF export so it no longer uses the same shared table-only structure for every organization. Inspector reports must branch by organization in the same way admin reports already do. DTI and City Veterinary Office inspector PDFs must render real photo-first inspection evidence blocks using the existing unsegmented `image_url` data. GCCCS must also receive its own inspector-specific structure, but it can remain more technical and compact than the field-oriented DTI and City Vet versions.

This design is a follow-up to `docs/superpowers/specs/2026-08-01-org-specific-real-pdf-reports-design.md`. That earlier design established the real frontend PDF system and organization-specific report architecture. This design narrows in on the remaining inspector-export gap.

## Problem Statement

The current inspector PDF export is structurally unacceptable for the approved report direction:

- every organization still receives the same inspector report body
- the report evidence is flattened into a single generic table
- the inspector report adapter does not carry image data into the report model
- timestamps are exported as raw ISO strings instead of readable report timestamps
- DTI and City Vet cannot show the original unsegmented inspection images because the PDF model cannot render image evidence blocks

The result is technically a PDF, but not an organization-specific inspector document. It reads like a generic data dump rather than a field evidence report aligned to the organization's role and letterhead.

## Approved Scope

This design covers inspector PDF exports only.

It does not redesign admin exports from scratch. Admin exports already follow organization-specific framing and stay in place.

This design stays frontend-only and continues using the existing real PDF export pipeline.

## Product Rules

### Output rules

- Inspector exports remain actual PDF files generated in the frontend.
- The existing organization letterhead/page-frame system remains in use.
- The new layout must be document-like, not a printed web table.

### Organization rules

- Inspector reports must branch by organization, not just by letterhead.
- DTI inspector reports must use a DTI-specific report structure.
- City Vet inspector reports must use a City Vet-specific report structure.
- GCCCS inspector reports must use a GCCCS-specific report structure.

### Evidence rules

- DTI and City Vet must show the original unsegmented meat inspection image when real `image_url` data exists.
- The exported image must come from existing real data only.
- If an inspection has no usable image, the report must show a plain missing-image state rather than fabricated content.

### Data rules

- Use only existing real inspection data already available in the frontend.
- Do not introduce new backend endpoints or derived placeholder metrics.
- Preserve the shared meat summary, but allow evidence presentation to vary by organization.

## Existing Data Available Today

From the existing inspector history export path, the frontend already has access to:

- selected report day
- generated-at timestamp
- report organization
- average confidence
- inspections for the selected day
- for each inspection:
  - `id`
  - `created_at`
  - `captured_at` when available
  - `meat_type`
  - `classification`
  - `confidence_score`
  - `image_url`
  - `location`
  - `location_latitude`
  - `location_longitude`
  - existing display-safe location formatting through the current location helper

No new data source is required for this change.

## Desired Report Direction

### Shared top-level shape

All inspector PDFs still share a common high-level backbone:

1. organization-specific page frame
2. inspector report metadata
3. shared meat summary section
4. organization-specific inspection evidence section

The change is in how the evidence section is modeled and rendered.

### GCCCS inspector report

GCCCS receives its own inspector structure instead of inheriting the same DTI/City Vet body.

The GCCCS version can stay more compact and systematic. It does not need to be photo-first if that weakens the technical/system-style presentation. It should still use only existing real fields and remain clearly different from DTI and City Vet.

### DTI inspector report

DTI inspector reports should read like field evidence prepared for market-service and operations oversight.

The evidence section should be photo-first:

- each inspection becomes its own evidence block
- the original unsegmented image appears first
- key facts appear immediately below the image:
  - captured time
  - meat type
  - classification
  - confidence
  - location

The section should feel like field documentation rather than a raw export table.

### City Vet inspector report

City Vet inspector reports should read like veterinary and meat-safety field evidence.

The structure is also photo-first, but the section naming and ordering should reflect meat-safety oversight rather than market operations. The same real evidence fields are used:

- original unsegmented image
- captured time
- meat type
- classification
- confidence
- location

## Report Model Changes

The current shared report domain model is too narrow for this requirement because it only supports:

- metrics
- detail rows
- plain tables

It does not support image-backed inspection evidence.

The report model must be expanded to support inspector evidence blocks as first-class report content. The new shape should:

- carry the image URL for each inspection
- distinguish photo evidence from plain string tables
- preserve readable inspection detail values without flattening everything into `string[][]`
- remain generic enough for the shared PDF engine to render while still letting organization templates reorder and rename sections

This should be an additive model expansion, not a separate parallel PDF stack.

## Adapter Changes

The inspector report adapter must stop collapsing every inspection into a single plain table row.

Instead, it should normalize each inspection into evidence-ready data with:

- stable inspection identity
- display-ready captured timestamp using `captured_at` when available and `created_at` as fallback
- meat type
- classification
- confidence label
- formatted location label
- original unsegmented `image_url`

This keeps presentation-specific formatting close to the adapter layer while leaving layout decisions to the template and PDF builder layers.

## Template Changes

Inspector templates should gain the same organization-specific branching concept already used by admin reports.

Each organization template must be able to:

- rename inspector evidence sections
- choose whether evidence is rendered as photo blocks or compact system-style blocks
- control section ordering within the inspector report body

The important rule is that inspector branching becomes real template behavior, not just different letterhead selection.

## PDF Rendering Changes

The shared PDF builder must learn how to render image-capable inspection evidence blocks.

### Evidence block layout rules

- DTI and City Vet evidence blocks are photo-first.
- Each block keeps one inspection's image and details together as one visual unit.
- The image should fit within a predictable document box without destructive cropping.
- Details should appear directly under or beside the image depending on available width, but must remain compact and legible.
- The layout must page-break cleanly without splitting one inspection awkwardly across pages whenever reasonable.

### Missing image rules

- If `image_url` is null, render a plain text fallback such as `No image captured`.
- If the image asset fails to load during PDF composition, render a plain fallback such as `Image unavailable`.
- Export must continue even when one image is missing.

### Timestamp rules

- Inspector PDFs must display human-readable timestamps.
- Raw ISO strings like `2026-05-24T00:08:34.448781+00:00` are not acceptable as final report presentation.

## Architecture Direction

Keep the existing real-PDF frontend architecture and extend it in place:

- `frontend/src/lib/reports/adapters/inspectorDailyReport.ts`
  - expand normalized inspector evidence data
- `frontend/src/lib/reports/types.ts`
  - add image-capable evidence content support
- `frontend/src/lib/reports/templates/`
  - add real inspector-specific section behavior per organization
- `frontend/src/lib/reports/pdf/buildDocDefinition.ts`
  - render inspector evidence blocks, including image loading and missing-image fallback
- `frontend/src/pages/user/history/utils/historyPage.ts`
  - preserve the image and captured-time fields needed by the adapter

This remains one shared PDF engine, not three disconnected per-organization PDF composers.

## Testing and Verification

### Functional verification

- Unit test inspector report model building for:
  - image preservation
  - captured-time fallback
  - organization-specific template selection
- Unit test that DTI and City Vet inspector models produce photo-capable evidence sections.
- Unit test that GCCCS inspector output follows its own structure rather than inheriting the DTI/City Vet evidence layout.
- Unit test that missing images render the correct fallback state in the PDF doc definition.

### Visual verification

Rendered PDF QA is required because layout is the product requirement.

Verification must include:

- generated DTI inspector PDF with visible unsegmented inspection images
- generated City Vet inspector PDF with visible unsegmented inspection images
- generated GCCCS inspector PDF with its own non-generic organization structure
- inspection of page breaks to make sure evidence blocks remain readable
- inspection of timestamp formatting to confirm raw ISO strings are gone

## Non-goals

This design does not include:

- changing admin report architecture beyond any shared renderer additions needed for inspector support
- inventing new organization metrics
- using segmented or transformed meat images instead of the original evidence image
- moving PDF generation to the backend
- replacing the page-frame/letterhead system already approved

## Acceptance Criteria

This design is successful when:

- inspector reports are structurally organization-specific, not just letterhead-specific
- DTI inspector PDFs show real unsegmented inspection images when available
- City Vet inspector PDFs show real unsegmented inspection images when available
- GCCCS inspector PDFs use their own organization-specific structure
- inspector timestamps are human-readable
- the shared meat summary remains present
- missing images fail gracefully without aborting the PDF export
- the solution stays in the frontend real-PDF pipeline
