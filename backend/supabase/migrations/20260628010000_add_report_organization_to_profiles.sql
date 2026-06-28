ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS report_organization TEXT;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_report_organization_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_report_organization_check
CHECK (
  report_organization IS NULL
  OR report_organization IN (
    'dti',
    'city_veterinary_office_olongapo',
    'gordon_college_ccs'
  )
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    inspector_code,
    report_organization
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'access_code',
    NEW.raw_user_meta_data ->> 'report_organization'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;
