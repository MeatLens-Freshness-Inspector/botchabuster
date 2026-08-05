-- Adds regulatory_compliance BOOLEAN to public.inspections.
--
-- Value semantics:
--   TRUE  — all three pre-scan safety checks passed
--           (storage_correct AND light_color_correct AND area_clean)
--   FALSE — at least one check failed
--   NULL  — pre-scan data was not collected (AI-only flow)
--
-- A BEFORE INSERT OR UPDATE trigger keeps the column in sync automatically
-- so callers that set the three source columns never need to compute this
-- themselves; the trigger does it.

ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS regulatory_compliance BOOLEAN;

-- Back-fill existing rows.
-- A row is considered to have pre-scan data when at least one of the three
-- source columns is non-NULL.
UPDATE public.inspections
SET regulatory_compliance = CASE
  WHEN storage_correct    IS NULL
   AND light_color_correct IS NULL
   AND area_clean          IS NULL
  THEN NULL
  ELSE (
    COALESCE(storage_correct,    FALSE) AND
    COALESCE(light_color_correct, FALSE) AND
    COALESCE(area_clean,          FALSE)
  )
END
WHERE regulatory_compliance IS NULL;

-- ----------------------------------------------------------------
-- Trigger function: recompute regulatory_compliance on every write.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_inspection_regulatory_compliance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.storage_correct    IS NULL
 AND NEW.light_color_correct IS NULL
 AND NEW.area_clean          IS NULL
  THEN
    NEW.regulatory_compliance := NULL;
  ELSE
    NEW.regulatory_compliance := (
      COALESCE(NEW.storage_correct,    FALSE) AND
      COALESCE(NEW.light_color_correct, FALSE) AND
      COALESCE(NEW.area_clean,          FALSE)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inspections_set_regulatory_compliance ON public.inspections;
CREATE TRIGGER inspections_set_regulatory_compliance
BEFORE INSERT OR UPDATE ON public.inspections
FOR EACH ROW
EXECUTE FUNCTION public.set_inspection_regulatory_compliance();
