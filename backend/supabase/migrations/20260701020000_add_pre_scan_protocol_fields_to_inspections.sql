ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS stall_number TEXT,
  ADD COLUMN IF NOT EXISTS meat_inspection_certificate_proof TEXT,
  ADD COLUMN IF NOT EXISTS meat_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS storage_correct BOOLEAN,
  ADD COLUMN IF NOT EXISTS light_color_correct BOOLEAN,
  ADD COLUMN IF NOT EXISTS light_color_observed TEXT,
  ADD COLUMN IF NOT EXISTS area_clean BOOLEAN,
  ADD COLUMN IF NOT EXISTS inspection_decision_source TEXT,
  ADD COLUMN IF NOT EXISTS protocol_spoiled_reason TEXT;

ALTER TABLE public.inspections
  DROP CONSTRAINT IF EXISTS inspections_decision_source_check,
  ADD CONSTRAINT inspections_decision_source_check
    CHECK (
      inspection_decision_source IS NULL
      OR inspection_decision_source IN ('ai', 'protocol_pre_scan')
    );
