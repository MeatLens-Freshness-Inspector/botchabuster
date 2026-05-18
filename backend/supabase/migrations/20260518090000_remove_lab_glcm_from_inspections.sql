ALTER TABLE public.inspections
  DROP COLUMN IF EXISTS lab_l,
  DROP COLUMN IF EXISTS lab_a,
  DROP COLUMN IF EXISTS lab_b,
  DROP COLUMN IF EXISTS glcm_contrast,
  DROP COLUMN IF EXISTS glcm_correlation,
  DROP COLUMN IF EXISTS glcm_energy,
  DROP COLUMN IF EXISTS glcm_homogeneity;
