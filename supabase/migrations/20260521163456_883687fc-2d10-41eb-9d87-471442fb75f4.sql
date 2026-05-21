
CREATE OR REPLACE FUNCTION public.get_recent_activity(limit_count int DEFAULT 20)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH items AS (
    (SELECT
       jsonb_build_object(
         'type', 'signup',
         'text', 'New member joined' || COALESCE(' from ' || NULLIF(city, ''), ''),
         'hot', false,
         'ts', created_at
       ) AS item,
       created_at AS ts
     FROM profiles
     WHERE created_at > now() - interval '7 days'
     ORDER BY created_at DESC
     LIMIT 20)
    UNION ALL
    (SELECT
       jsonb_build_object(
         'type', 'sparks_bought',
         'text', 'Someone just bought ' || (sparks_amount + COALESCE(bonus_sparks,0))::text || ' Sparks',
         'hot', true,
         'ts', COALESCE(decided_at, updated_at)
       ),
       COALESCE(decided_at, updated_at)
     FROM payment_requests
     WHERE status = 'approved'
       AND COALESCE(decided_at, updated_at) > now() - interval '14 days'
     ORDER BY COALESCE(decided_at, updated_at) DESC
     LIMIT 20)
    UNION ALL
    (SELECT
       jsonb_build_object(
         'type', 'featured',
         'text', 'A provider just got featured (' || sparks_cost::text || ' Sparks)',
         'hot', true,
         'ts', created_at
       ),
       created_at
     FROM featured_workers
     WHERE created_at > now() - interval '14 days'
     ORDER BY created_at DESC
     LIMIT 20)
    UNION ALL
    (SELECT
       jsonb_build_object(
         'type', 'blood_request',
         'text', 'Urgent: ' || blood_group || ' blood needed' || COALESCE(' in ' || NULLIF(city, ''), ''),
         'hot', true,
         'ts', created_at
       ),
       created_at
     FROM blood_requests
     WHERE status = 'open'
       AND created_at > now() - interval '7 days'
     ORDER BY created_at DESC
     LIMIT 20)
    UNION ALL
    (SELECT
       jsonb_build_object(
         'type', 'job',
         'text', 'New job posted: ' || left(title, 60),
         'hot', false,
         'ts', created_at
       ),
       created_at
     FROM jobs
     WHERE status = 'open'
       AND created_at > now() - interval '7 days'
     ORDER BY created_at DESC
     LIMIT 20)
    UNION ALL
    (SELECT
       jsonb_build_object(
         'type', 'review',
         'text', 'New ' || rating::text || '★ review posted',
         'hot', false,
         'ts', created_at
       ),
       created_at
     FROM reviews
     WHERE created_at > now() - interval '7 days'
       AND rating >= 4
     ORDER BY created_at DESC
     LIMIT 20)
  )
  SELECT COALESCE(jsonb_agg(item ORDER BY ts DESC), '[]'::jsonb)
  FROM (SELECT item, ts FROM items ORDER BY ts DESC LIMIT limit_count) t;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_activity(int) TO anon, authenticated;

INSERT INTO public.app_settings (key, value, description)
VALUES (
  'announcement_messages',
  '["Welcome to Near Konnect — your hyperlocal network","Safety protocols for verified providers updated","Buy Sparks to boost your visibility"]'::jsonb,
  'Static announcement messages shown in the top activity bar'
)
ON CONFLICT (key) DO NOTHING;
