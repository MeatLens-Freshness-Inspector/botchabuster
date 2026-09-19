-- Register the September 19 full-data deployment as primary.
-- Keep the September 18 model as a separately selectable legacy version.

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
    0.9481481481481482,
    '2026-09-19T00:00:00Z'
  ),
  (
    'mobilenet-sep18-model4-2026-09-18',
    'Sep 18 MobileNetV3',
    0.907725321888412,
    '2026-09-18T00:00:00Z'
  )
ON CONFLICT (version_key) DO NOTHING;
