-- Forward-only query support for the modular backend.
-- Existing migrations and policies are intentionally left untouched.

CREATE INDEX IF NOT EXISTS inspections_user_created_id_idx
  ON public.inspections (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS inspections_created_id_idx
  ON public.inspections (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS user_sessions_user_expires_idx
  ON public.user_sessions (user_id, expires_at);

CREATE INDEX IF NOT EXISTS passkey_credentials_user_created_idx
  ON public.passkey_credentials (user_id, created_at DESC, credential_id);

CREATE INDEX IF NOT EXISTS audit_logs_created_id_idx
  ON public.audit_logs (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS user_roles_role_user_id_idx
  ON public.user_roles (role, user_id);

CREATE INDEX IF NOT EXISTS user_chat_messages_pair_created_id_idx
  ON public.user_chat_messages (
    LEAST(sender_id, recipient_id),
    GREATEST(sender_id, recipient_id),
    created_at DESC,
    id DESC
  );

CREATE OR REPLACE FUNCTION public.get_landing_page_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'inspectionCount', (SELECT count(*) FROM public.inspections),
    'userCount', (SELECT count(*) FROM public.profiles),
    'freshRate', COALESCE((
      SELECT round(
        100.0 * count(*) FILTER (
          WHERE classification::text IN ('fresh', 'acceptable', 'not fresh')
        ) / NULLIF(count(*), 0)
      )::integer
      FROM public.inspections
    ), 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_inspection_classification_stats(
  _user_id uuid,
  _include_all boolean DEFAULT false
)
RETURNS TABLE(classification text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.classification::text,
    count(*)::bigint
  FROM public.inspections AS i
  WHERE COALESCE(_include_all, false) OR i.user_id = _user_id
  GROUP BY i.classification::text;
$$;

CREATE OR REPLACE FUNCTION public.get_in_app_model_metrics()
RETURNS TABLE(predicted text, actual text, meat_type text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.classification::text,
    COALESCE(i.manual_classification::text, i.classification::text),
    i.meat_type::text,
    count(*)::bigint
  FROM public.inspections AS i
  GROUP BY
    i.classification::text,
    COALESCE(i.manual_classification::text, i.classification::text),
    i.meat_type::text;
$$;

CREATE OR REPLACE FUNCTION public.get_user_chat_contact_summary(_actor_id uuid)
RETURNS TABLE(counterparty_id uuid, last_message_content text, last_message_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (
    CASE
      WHEN m.sender_id = _actor_id THEN m.recipient_id
      ELSE m.sender_id
    END
  )
    CASE
      WHEN m.sender_id = _actor_id THEN m.recipient_id
      ELSE m.sender_id
    END AS counterparty_id,
    m.content,
    m.created_at
  FROM public.user_chat_messages AS m
  WHERE m.sender_id = _actor_id OR m.recipient_id = _actor_id
  ORDER BY
    CASE
      WHEN m.sender_id = _actor_id THEN m.recipient_id
      ELSE m.sender_id
    END,
    m.created_at DESC,
    m.id DESC;
$$;

REVOKE ALL ON FUNCTION public.get_landing_page_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_landing_page_stats() TO service_role;

REVOKE ALL ON FUNCTION public.get_inspection_classification_stats(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_inspection_classification_stats(uuid, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.get_in_app_model_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_in_app_model_metrics() TO service_role;

REVOKE ALL ON FUNCTION public.get_user_chat_contact_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_chat_contact_summary(uuid) TO service_role;
