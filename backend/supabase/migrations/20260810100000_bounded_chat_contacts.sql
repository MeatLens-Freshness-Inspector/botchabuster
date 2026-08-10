-- Bounded chat contact reads for the modular backend.
-- This is a forward-only migration; existing migrations remain unchanged.
CREATE OR REPLACE FUNCTION public.get_user_chat_contacts(_actor_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  email text,
  inspector_code text,
  location text,
  role text,
  last_message_preview text,
  last_message_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH actor AS (
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _actor_id
      AND role IN ('admin', 'developer')
  ) AS is_privileged
), contact_privileges AS (
  SELECT
    user_id,
    bool_or(role IN ('admin', 'developer')) AS is_privileged
  FROM public.user_roles
  GROUP BY user_id
)
SELECT
  p.id,
  p.full_name,
  au.email,
  p.inspector_code,
  p.location,
  CASE WHEN COALESCE(cp.is_privileged, false) THEN 'admin' ELSE 'user' END AS role,
  latest.content AS last_message_preview,
  latest.created_at AS last_message_at
FROM public.profiles AS p
JOIN auth.users AS au ON au.id = p.id
CROSS JOIN actor AS a
LEFT JOIN contact_privileges AS cp ON cp.user_id = p.id
LEFT JOIN LATERAL (
  SELECT m.content, m.created_at
  FROM public.user_chat_messages AS m
  WHERE (m.sender_id = _actor_id AND m.recipient_id = p.id)
     OR (m.sender_id = p.id AND m.recipient_id = _actor_id)
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT 1
) AS latest ON true
WHERE p.id <> _actor_id
  AND (
    (a.is_privileged AND NOT COALESCE(cp.is_privileged, false))
    OR (NOT a.is_privileged AND COALESCE(cp.is_privileged, false))
  )
ORDER BY latest.created_at DESC NULLS LAST, COALESCE(p.full_name, au.email, p.id::text), p.id;
$$;

REVOKE ALL ON FUNCTION public.get_user_chat_contacts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_chat_contacts(uuid) TO service_role;
