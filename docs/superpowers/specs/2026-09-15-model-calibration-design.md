# MeatLens Model Calibration Design

**Date:** 2026-09-15

## Goal

Add a developer/admin-only Model Calibration section to the existing Overview tab that answers whether reported confidence is trustworthy, while keeping controlled evaluation calibration separate from production dispute monitoring.

## Existing context

MeatLens already stores the original inspection classification and confidence, model-version references for inspections where available, reviewed dispute outcomes, developer dataset labels, aggregate model-accuracy snapshots, and imported training-run manifests. The current model-accuracy snapshot function aggregates production inspections with official labels; those snapshots are not suitable as controlled calibration evidence and remain backward-compatible legacy data.

The existing Overview dispute section remains unchanged. The new analytics surface complements it and uses the existing cards, chart wrapper, responsive dashboard shells, auth middleware, audit-log service, inspection detail sheet, and report export conventions.

## Calibration package contract

The `meatlens-training-2` evaluation stages will produce a versioned ZIP package:

```text
calibration-package.zip
├── manifest.json
└── predictions.jsonl
```

Each JSONL record contains `sampleId`, `groundTruth`, `predictedClass`, `confidence`, and a complete `probabilities` object keyed by the pipeline's actual label order. The manifest contains the schema version, model identity/version when available, dataset name/split, class labels, and row count. Images, raw datasets, and training artifacts are not stored in the application database.

The backend validates the package, records an immutable import and normalized prediction rows, associates the optional registered model version without inventing versions, and prevents duplicate import/sample rows. Imports are developer/admin-only and produce an audit-log event.

## Metric semantics

The default is ten equal-width confidence bins:

```text
[0.0, 0.1), [0.1, 0.2), ..., [0.8, 0.9), [0.9, 1.0]
```

The final bin includes `1.0`. All other bins are left-inclusive and right-exclusive, so exact boundary values have deterministic ownership.

For the All class view, each row uses the maximum predicted probability as confidence and exact predicted-class correctness as the outcome. For an individual class, the view uses that class's probability and a one-vs-rest outcome (`groundTruth === selectedClass`). This provides a meaningful per-class reliability view without treating an undisputed field prediction as truth.

Expected Calibration Error is:

```text
ECE = sum over non-empty bins of (bin count / total count)
      * absolute(mean confidence - observed accuracy)
```

Brier score is the mean squared probability error. The multiclass view uses the full probability vector against a one-hot ground-truth vector. An individual class view uses the selected class's one-vs-rest probability and binary outcome. Every response includes the total labeled sample count and per-bin counts; no calibration statistic is presented without its denominator.

## Backend architecture

The existing model-accuracy module is extended rather than duplicated. New domain types and pure metric functions define validated calibration rows, bins, reliability points, confidence distributions, per-class summaries, and field-confidence results. A repository port provides imports, model filters, controlled rows, and production field-monitoring aggregates.

The authenticated analytics endpoint returns one view model containing:

- available model/version filters;
- controlled calibration metrics and reliability bins;
- confidence distribution;
- per-class calibration breakdown;
- field confidence monitoring;
- high-confidence approved-dispute investigation rows.

The endpoint accepts model/version and class filters. Model provenance is optional for legacy records and is displayed only when supplied by the evaluation producer or matched to a registered model version.

Field monitoring is calculated from original inspection confidence plus dispute status. It reports dispute, approved, rejected, and denominator counts by confidence range. It is explicitly labeled observational monitoring, never model accuracy. Approved disputes use the application's reviewed outcome, but the UI explains that production dispute outcomes are not equivalent to a controlled experiment.

## Frontend architecture

The existing Overview tab receives a developer/admin-only Model Calibration section. It uses the existing `ChartContainer`, Recharts, Card, Table, Select, loading, error, and empty-state conventions. The page includes model/version and class filters, ECE/Brier/sample cards, a reliability diagram with ideal diagonal and sample-count tooltips, confidence distribution, per-class table, field monitoring charts/table, and a high-confidence approved-dispute table.

The high-confidence threshold is defined once in the model-calibration domain configuration and is surfaced in the UI copy. Each investigation row includes inspection ID, original prediction, original confidence, dispute status, submission/review dates, and model/version where available. Navigation uses the existing History route and inspection detail sheet via route state; no duplicate detail page is created.

The Overview dispute statistics and status/time charts are not replaced or duplicated. Existing dispute data remains available to the existing section, while the new section adds only confidence-oriented analysis.

## Reports and logging

The calibration response types and already-computed metrics are made available to report export models where useful. Reports consume the response rather than reimplementing ECE or Brier calculations. Existing production model-accuracy history remains labeled as reviewed-label/legacy history in explanatory copy.

Dashboard reads are not audit logged. Calibration imports and other state-changing operations use the existing audit-log service with actor, source, import, model, and sample-count metadata.

## Security and data integrity

Analytics and imports require the existing authenticated developer/admin privilege boundary; developer access continues to include admin access through the existing privilege summary. Supabase tables use the existing service-role/RLS convention. Original inspection classification, confidence, model identity, and dispute history are never overwritten when a dispute is approved.

## Testing

Backend tests cover ECE, Brier score, boundary binning, empty bins, class/model filtering, import validation, duplicate protection, field aggregation, approved/rejected separation, high-confidence selection, route authorization, and API validation. Frontend tests cover client response validation, query filters, chart/table empty/loading/error states, and History navigation state. Training tests cover JSONL/package generation from deterministic prediction frames and later-stage notebook/package wiring. Existing tests and quality gates remain intact.

## Limitations

Controlled calibration is unavailable until an evaluation package is generated and imported. Production dispute rates reveal where users challenge model outputs and how reviews resolve, but they do not establish accuracy for undisputed predictions and should not be interpreted as a calibrated model correctness rate. Small bins are displayed with counts and flagged as low-sample rather than hidden or smoothed.
