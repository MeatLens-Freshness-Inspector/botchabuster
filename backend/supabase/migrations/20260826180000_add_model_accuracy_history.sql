-- Forward-only model-version and daily accuracy history support.

CREATE TABLE IF NOT EXISTS public.model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_key text NOT NULL UNIQUE CHECK (char_length(btrim(version_key)) BETWEEN 1 AND 200),
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 200),
  expected_accuracy numeric(5,4) NOT NULL CHECK (expected_accuracy BETWEEN 0 AND 1),
  active_from timestamptz NOT NULL,
  retired_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (retired_at IS NULL OR retired_at > active_from)
);

ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS model_version_id uuid
  REFERENCES public.model_versions(id)
  ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS public.model_accuracy_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id uuid NOT NULL REFERENCES public.model_versions(id) ON DELETE RESTRICT,
  snapshot_date date NOT NULL,
  expected_accuracy numeric(5,4) NOT NULL CHECK (expected_accuracy BETWEEN 0 AND 1),
  evaluated_count integer NOT NULL CHECK (evaluated_count >= 0),
  correct_count integer NOT NULL CHECK (correct_count >= 0 AND correct_count <= evaluated_count),
  observed_accuracy numeric(5,4) CHECK (observed_accuracy IS NULL OR observed_accuracy BETWEEN 0 AND 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_version_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS inspections_model_version_created_id_idx
  ON public.inspections (model_version_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS model_accuracy_snapshots_date_version_idx
  ON public.model_accuracy_snapshots (snapshot_date DESC, model_version_id);

ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_accuracy_snapshots ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.model_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.model_accuracy_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.model_versions TO service_role;
GRANT SELECT, INSERT ON TABLE public.model_accuracy_snapshots TO service_role;

CREATE OR REPLACE FUNCTION public.prevent_model_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.version_key IS DISTINCT FROM OLD.version_key
    OR NEW.display_name IS DISTINCT FROM OLD.display_name
    OR NEW.expected_accuracy IS DISTINCT FROM OLD.expected_accuracy
    OR NEW.active_from IS DISTINCT FROM OLD.active_from
  THEN
    RAISE EXCEPTION 'model_version_identity_is_immutable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS model_versions_immutable_identity ON public.model_versions;
CREATE TRIGGER model_versions_immutable_identity
BEFORE UPDATE ON public.model_versions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_model_version_mutation();

CREATE OR REPLACE FUNCTION public.capture_model_accuracy_snapshots(
  p_snapshot_date date DEFAULT ((timezone('utc', now()))::date - 1)
)
RETURNS SETOF public.model_accuracy_snapshots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz := p_snapshot_date::timestamp AT TIME ZONE 'UTC';
  v_end timestamptz := (p_snapshot_date + 1)::timestamp AT TIME ZONE 'UTC';
BEGIN
  IF p_snapshot_date > (timezone('utc', now()))::date THEN
    RAISE EXCEPTION 'snapshot_date_cannot_be_in_future';
  END IF;

  RETURN QUERY
  WITH eligible_versions AS (
    SELECT mv.id, mv.expected_accuracy
    FROM public.model_versions AS mv
    WHERE mv.active_from < v_end
      AND (mv.retired_at IS NULL OR mv.retired_at >= v_start)
  ), aggregates AS (
    SELECT
      i.model_version_id,
      count(*) FILTER (WHERE i.official_classification IS NOT NULL)::integer AS evaluated_count,
      count(*) FILTER (
        WHERE i.official_classification IS NOT NULL
          AND i.classification = i.official_classification
      )::integer AS correct_count
    FROM public.inspections AS i
    WHERE i.created_at >= v_start
      AND i.created_at < v_end
    GROUP BY i.model_version_id
  ), inserted AS (
    INSERT INTO public.model_accuracy_snapshots (
      model_version_id,
      snapshot_date,
      expected_accuracy,
      evaluated_count,
      correct_count,
      observed_accuracy
    )
    SELECT
      v.id,
      p_snapshot_date,
      v.expected_accuracy,
      COALESCE(a.evaluated_count, 0),
      COALESCE(a.correct_count, 0),
      CASE
        WHEN COALESCE(a.evaluated_count, 0) = 0 THEN NULL
        ELSE a.correct_count::numeric / a.evaluated_count
      END
    FROM eligible_versions AS v
    LEFT JOIN aggregates AS a ON a.model_version_id = v.id
    ON CONFLICT (model_version_id, snapshot_date) DO NOTHING
    RETURNING *
  )
  SELECT * FROM inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_model_accuracy_snapshots(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_model_accuracy_snapshots(date) TO service_role;
