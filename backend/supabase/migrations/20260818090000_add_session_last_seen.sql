ALTER TABLE public.user_sessions
  ADD COLUMN last_seen_at TIMESTAMPTZ;

UPDATE public.user_sessions
SET last_seen_at = created_at
WHERE last_seen_at IS NULL;

ALTER TABLE public.user_sessions
  ALTER COLUMN last_seen_at SET DEFAULT now(),
  ALTER COLUMN last_seen_at SET NOT NULL;

CREATE INDEX user_sessions_last_seen_at_idx
  ON public.user_sessions (last_seen_at);
