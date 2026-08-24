-- Forward-only inspection result dispute workflow.
-- Existing inspections intentionally retain NULL official_classification.

ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS official_classification public.freshness_classification;

CREATE TABLE IF NOT EXISTS public.inspection_result_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  expected_classification public.freshness_classification NOT NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  developer_label_applied_at timestamptz,
  developer_label_applied_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inspection_result_disputes_one_pending
  ON public.inspection_result_disputes (inspection_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS inspection_result_disputes_status_created_idx
  ON public.inspection_result_disputes (status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS inspection_result_disputes_inspection_created_idx
  ON public.inspection_result_disputes (inspection_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.get_landing_page_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'inspectionCount', (SELECT count(*) FROM public.inspections),
    'userCount', (SELECT count(*) FROM public.profiles),
    'freshRate', COALESCE((
      SELECT round(
        100.0 * count(*) FILTER (
          WHERE COALESCE(official_classification, classification)::text IN ('fresh', 'acceptable', 'not fresh')
        ) / NULLIF(count(*), 0)
      )::integer
      FROM public.inspections
    ), 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_inspection_classification_stats(
  _user_id uuid,
  _include_all boolean DEFAULT false
)
RETURNS TABLE(classification text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(i.official_classification, i.classification)::text,
    count(*)::bigint
  FROM public.inspections AS i
  WHERE COALESCE(_include_all, false) OR i.user_id = _user_id
  GROUP BY COALESCE(i.official_classification, i.classification)::text;
$$;

ALTER TABLE public.inspection_result_disputes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.inspection_result_disputes TO service_role;

DROP POLICY IF EXISTS "Allow all operations for service role" ON public.inspection_result_disputes;
CREATE POLICY "Service role manages inspection result disputes"
  ON public.inspection_result_disputes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.apply_inspection_dispute_to_developer_dataset(
  p_dispute_id uuid,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute public.inspection_result_disputes;
  v_inspection public.inspections;
  v_previous_manual_classification public.freshness_classification;
BEGIN
  SELECT * INTO v_dispute
  FROM public.inspection_result_disputes
  WHERE id = p_dispute_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'dispute_not_found';
  END IF;

  IF v_dispute.status <> 'pending' THEN
    RAISE EXCEPTION 'dispute_not_pending';
  END IF;

  SELECT manual_classification INTO v_previous_manual_classification
  FROM public.inspections
  WHERE id = v_dispute.inspection_id
  FOR UPDATE;

  UPDATE public.inspections
  SET manual_classification = v_dispute.expected_classification,
      updated_at = now()
  WHERE id = v_dispute.inspection_id
  RETURNING * INTO v_inspection;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inspection_not_found';
  END IF;

  UPDATE public.inspection_result_disputes
  SET developer_label_applied_at = now(),
      developer_label_applied_by = p_actor_id,
      updated_at = now()
  WHERE id = p_dispute_id
  RETURNING * INTO v_dispute;

  RETURN jsonb_build_object(
    'dispute', to_jsonb(v_dispute),
    'inspection', to_jsonb(v_inspection),
    'previous_manual_classification', v_previous_manual_classification
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.review_inspection_result_dispute(
  p_dispute_id uuid,
  p_actor_id uuid,
  p_decision text,
  p_reviewer_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute public.inspection_result_disputes;
  v_inspection public.inspections;
  v_previous_official_classification public.freshness_classification;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid_review_decision';
  END IF;

  SELECT * INTO v_dispute
  FROM public.inspection_result_disputes
  WHERE id = p_dispute_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'dispute_not_found';
  END IF;

  IF v_dispute.status <> 'pending' THEN
    RAISE EXCEPTION 'dispute_not_pending';
  END IF;

  SELECT official_classification INTO v_previous_official_classification
  FROM public.inspections
  WHERE id = v_dispute.inspection_id
  FOR UPDATE;

  IF p_decision = 'approved' THEN
    UPDATE public.inspections
    SET official_classification = v_dispute.expected_classification,
        updated_at = now()
    WHERE id = v_dispute.inspection_id
    RETURNING * INTO v_inspection;
  ELSE
    SELECT * INTO v_inspection
    FROM public.inspections
    WHERE id = v_dispute.inspection_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inspection_not_found';
  END IF;

  UPDATE public.inspection_result_disputes
  SET status = p_decision,
      reviewed_at = now(),
      reviewed_by = p_actor_id,
      reviewer_note = NULLIF(btrim(p_reviewer_note), ''),
      updated_at = now()
  WHERE id = p_dispute_id
  RETURNING * INTO v_dispute;

  RETURN jsonb_build_object(
    'dispute', to_jsonb(v_dispute),
    'inspection', to_jsonb(v_inspection),
    'previous_official_classification', v_previous_official_classification
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_inspection_dispute_to_developer_dataset(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_inspection_dispute_to_developer_dataset(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.review_inspection_result_dispute(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_inspection_result_dispute(uuid, uuid, text, text) TO service_role;
