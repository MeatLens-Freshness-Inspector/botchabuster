-- Forward-only controlled calibration result storage.
-- Only normalized labeled predictions are stored; images and raw training data stay in the ML pipeline.

CREATE TABLE IF NOT EXISTS public.model_calibration_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_hash text NOT NULL UNIQUE CHECK (source_hash = btrim(source_hash) AND char_length(source_hash) BETWEEN 32 AND 128),
  model_version_id uuid REFERENCES public.model_versions(id) ON DELETE RESTRICT,
  model_version_key text CHECK (model_version_key IS NULL OR model_version_key = btrim(model_version_key)),
  sample_count integer NOT NULL CHECK (sample_count > 0),
  imported_by uuid NOT NULL REFERENCES auth.users(id),
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.model_calibration_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.model_calibration_imports(id) ON DELETE RESTRICT,
  sample_id text NOT NULL CHECK (sample_id = btrim(sample_id) AND char_length(sample_id) BETWEEN 1 AND 500),
  ground_truth text NOT NULL CHECK (ground_truth = btrim(ground_truth) AND char_length(ground_truth) BETWEEN 1 AND 200),
  predicted_class text NOT NULL CHECK (predicted_class = btrim(predicted_class) AND char_length(predicted_class) BETWEEN 1 AND 200),
  confidence numeric(6,5) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  probabilities jsonb NOT NULL CHECK (jsonb_typeof(probabilities) = 'object'),
  model_version_id uuid REFERENCES public.model_versions(id) ON DELETE RESTRICT,
  model_version_key text CHECK (model_version_key IS NULL OR model_version_key = btrim(model_version_key)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_id, sample_id)
);

CREATE INDEX IF NOT EXISTS model_calibration_samples_model_key_idx
  ON public.model_calibration_samples (model_version_key, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS model_calibration_samples_import_idx
  ON public.model_calibration_samples (import_id, id);
CREATE INDEX IF NOT EXISTS model_calibration_imports_model_key_idx
  ON public.model_calibration_imports (model_version_key, imported_at DESC, id DESC);

ALTER TABLE public.model_calibration_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_calibration_samples ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.model_calibration_imports FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.model_calibration_samples FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.model_calibration_imports TO service_role;
GRANT SELECT, INSERT ON TABLE public.model_calibration_samples TO service_role;
