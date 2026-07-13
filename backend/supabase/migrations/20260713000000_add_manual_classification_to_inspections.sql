ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS manual_classification freshness_classification;

UPDATE public.inspections
SET manual_classification = classification
WHERE manual_classification IS NULL;

ALTER TABLE public.inspections
  ALTER COLUMN manual_classification SET NOT NULL;

CREATE OR REPLACE FUNCTION public.set_inspection_manual_classification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.manual_classification IS NULL THEN
    NEW.manual_classification := NEW.classification;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inspections_set_manual_classification ON public.inspections;
CREATE TRIGGER inspections_set_manual_classification
BEFORE INSERT ON public.inspections
FOR EACH ROW
EXECUTE FUNCTION public.set_inspection_manual_classification();
