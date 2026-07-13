CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Privileged users can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'developer'::public.app_role]));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Privileged users can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'developer'::public.app_role]));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Privileged users can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'developer'::public.app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'developer'::public.app_role]));

DROP POLICY IF EXISTS "Admins can view all inspections" ON public.inspections;
CREATE POLICY "Privileged users can view all inspections"
  ON public.inspections FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'developer'::public.app_role]));

DROP POLICY IF EXISTS "Admins can delete any inspection" ON public.inspections;
CREATE POLICY "Privileged users can delete any inspection"
  ON public.inspections FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'developer'::public.app_role]));

DROP POLICY IF EXISTS "Admins can manage access codes" ON public.access_codes;
CREATE POLICY "Privileged users can manage access codes"
  ON public.access_codes FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'developer'::public.app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'developer'::public.app_role]));

DROP POLICY IF EXISTS "Admins can manage market locations" ON public.market_locations;
CREATE POLICY "Privileged users can manage market locations"
  ON public.market_locations FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'developer'::public.app_role]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin'::public.app_role, 'developer'::public.app_role]));
