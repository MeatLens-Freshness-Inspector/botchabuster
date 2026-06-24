ALTER TABLE public.passkey_credentials ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.passkey_credentials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.passkey_credentials TO service_role;

CREATE POLICY "Users can view their own passkeys"
  ON public.passkey_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own passkeys"
  ON public.passkey_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own passkeys"
  ON public.passkey_credentials
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own passkeys"
  ON public.passkey_credentials
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages passkeys"
  ON public.passkey_credentials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
