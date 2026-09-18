-- Register the final deployment MobileNetV3 model as a distinct version.
-- Keep the prior primary version available for historical analysis records.

INSERT INTO public.model_versions (
  version_key,
  display_name,
  expected_accuracy,
  active_from
)
VALUES (
  'mobilenet-primary-final-2026-09-18',
  'Primary MobileNetV3',
  0.9077,
  '2026-09-18T00:00:00Z'
)
ON CONFLICT (version_key) DO NOTHING;
