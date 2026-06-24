REVOKE ALL ON TABLE public.passkey_credentials FROM anon;
REVOKE ALL ON TABLE public.passkey_credentials FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.passkey_credentials TO service_role;

DROP POLICY IF EXISTS "Service role manages passkeys" ON public.passkey_credentials;

CREATE POLICY "Service role manages passkeys"
  ON public.passkey_credentials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
