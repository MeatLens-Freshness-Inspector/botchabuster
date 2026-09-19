-- Reconcile every current and historical model identity used by MeatLens.
-- This is forward-only and safe to run after any earlier registration migration.

INSERT INTO public.model_versions (
  version_key,
  display_name,
  expected_accuracy,
  active_from
)
VALUES
  (
    'mobilenet-primary-final-2026-09-19',
    'Primary MobileNetV3',
    0.9481,
    '2026-09-19T00:00:00Z'
  ),
  (
    'mobilenet-sep18-model4-2026-09-18',
    'Sep 18 MobileNetV3',
    0.9077,
    '2026-09-18T00:00:00Z'
  ),
  (
    'mobilenet-primary-final-2026-09-18',
    'Primary MobileNetV3',
    0.9077,
    '2026-09-18T00:00:00Z'
  ),
  (
    'mobilenet-primary-2026-08-13',
    'Primary MobileNetV3',
    0.9639,
    '2026-08-13T00:00:00Z'
  ),
  (
    'mobilenet-seed123-model2-2026-05-19',
    'Seed123 MobileNetV3',
    0.9639,
    '2026-05-19T00:00:00Z'
  ),
  (
    'mobilenet-legacy-2026-05-05',
    'Legacy MobileNetV3',
    0.7299,
    '2026-05-05T00:00:00Z'
  ),
  (
    'resnet50-2026-05-01',
    'ResNet50',
    0.7299,
    '2026-05-01T00:00:00Z'
  ),
  (
    'ensemble-2026-08-26',
    'Ensemble',
    0.9639,
    '2026-08-26T00:00:00Z'
  )
ON CONFLICT (version_key) DO NOTHING;
