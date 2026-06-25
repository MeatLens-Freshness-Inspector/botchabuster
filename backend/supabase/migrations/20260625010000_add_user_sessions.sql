-- Tracks active sessions per user to enforce a concurrent device limit.
-- The session_token_hash is a SHA-256 hex digest of the access token so that
-- raw tokens are never stored in the database.

CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX user_sessions_user_id_idx ON public.user_sessions (user_id);
CREATE INDEX user_sessions_expires_at_idx ON public.user_sessions (expires_at);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Only the service role (backend) manages session rows directly.
CREATE POLICY "Service role manages user sessions"
  ON public.user_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
