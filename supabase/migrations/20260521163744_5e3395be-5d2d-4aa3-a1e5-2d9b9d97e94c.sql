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
         'text', COALESCE(NULLIF(p.full_name, ''), 'A new member') || ' just joined' || COALESCE(' from ' || NULLIF(p.city, ''), ''),
         'hot', false,
         'ts', p.created_at
       ) AS item,
       p.created_at AS ts
     FROM profiles p
     WHERE p.created_at > now() - interval '7 days'
     ORDER BY p.created_at DESC
     LIMIT 20)
    UNION ALL
    (SELECT
       jsonb_build_object(
         'type', 'sparks_bought',
         'text', COALESCE(NULLIF(p.full_name, ''), 'Someone') || ' just bought ' || (pr.sparks_amount + COALESCE(pr.bonus_sparks,0))::text || ' Sparks',
         'hot', true,
         'ts', COALESCE(pr.decided_at, pr.updated_at)
       ),
       COALESCE(pr.decided_at, pr.updated_at)
     FROM payment_requests pr
     LEFT JOIN profiles p ON p.user_id = pr.user_id
     WHERE pr.status = 'approved'
       AND COALESCE(pr.decided_at, pr.updated_at) > now() - interval '14 days'
     ORDER BY COALESCE(pr.decided_at, pr.updated_at) DESC
     LIMIT 20)
    UNION ALL
    (SELECT
       jsonb_build_object(
         'type', 'featured',
         'text', COALESCE(NULLIF(p.full_name, ''), 'A provider') || ' just got featured (' || fw.sparks_cost::text || ' Sparks)',
         'hot', true,
         'ts', fw.created_at
       ),
       fw.created_at
     FROM featured_workers fw
     LEFT JOIN profiles p ON p.user_id = fw.user_id
     WHERE fw.created_at > now() - interval '14 days'
     ORDER BY fw.created_at DESC
     LIMIT 20)
    UNION ALL
    (SELECT
       jsonb_build_object(
         'type', 'blood_request',
         'text', COALESCE(NULLIF(p.full_name, ''), 'Someone') || ' needs ' || br.blood_group || ' blood' || COALESCE(' in ' || NULLIF(br.city, ''), ''),
         'hot', true,
         'ts', br.created_at
       ),
       br.created_at
     FROM blood_requests br
     LEFT JOIN profiles p ON p.user_id = br.requester_id
     WHERE br.status = 'open'
       AND br.created_at > now() - interval '7 days'
     ORDER BY br.created_at DESC
     LIMIT 20)
    UNION ALL
    (SELECT
       jsonb_build_object(
         'type', 'job',
         'text', COALESCE(NULLIF(p.full_name, ''), 'Someone') || ' posted a job: ' || left(j.title, 60),
         'hot', false,
         'ts', j.created_at
       ),
       j.created_at
     FROM jobs j
     LEFT JOIN profiles p ON p.user_id = j.poster_id
     WHERE j.status = 'open'
       AND j.created_at > now() - interval '7 days'
     ORDER BY j.created_at DESC
     LIMIT 20)
    UNION ALL
    (SELECT
       jsonb_build_object(
         'type', 'review',
         'text', COALESCE(NULLIF(p.full_name, ''), 'A customer') || ' left a ' || r.rating::text || '★ review',
         'hot', false,
         'ts', r.created_at
       ),
       r.created_at
     FROM reviews r
     LEFT JOIN profiles p ON p.user_id = r.customer_id
     WHERE r.created_at > now() - interval '7 days'
       AND r.rating >= 4
     ORDER BY r.created_at DESC
     LIMIT 20)
  )
  SELECT COALESCE(jsonb_agg(item ORDER BY ts DESC), '[]'::jsonb)
  FROM (SELECT item, ts FROM items ORDER BY ts DESC LIMIT limit_count) t;
$$;