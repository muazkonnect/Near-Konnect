CREATE OR REPLACE FUNCTION public.get_promoted_explore(
  _viewer_lat double precision,
  _viewer_lng double precision,
  _limit integer DEFAULT 8,
  _offset integer DEFAULT 0,
  _exclude_campaign_ids uuid[] DEFAULT '{}'::uuid[],
  _main_category text DEFAULT NULL,
  _sub_category text DEFAULT NULL,
  _search text DEFAULT NULL,
  _radius_km integer DEFAULT NULL
)
RETURNS TABLE(campaign_id uuid, worker_id uuid, user_id uuid, distance_km double precision, priority integer, ends_at timestamp with time zone, match_score integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_viewer geography;
BEGIN
  IF _viewer_lat IS NULL OR _viewer_lng IS NULL THEN RETURN; END IF;
  v_viewer := ST_SetSRID(ST_MakePoint(_viewer_lng, _viewer_lat), 4326)::geography;
  RETURN QUERY
  SELECT c.id, c.worker_id, c.owner_user_id,
         ST_Distance(g.center, v_viewer) / 1000.0 AS dkm,
         c.priority,
         c.ends_at,
         (
           CASE WHEN _sub_category IS NOT NULL AND w.sub_category = _sub_category THEN 100 ELSE 0 END
         + CASE WHEN _main_category IS NOT NULL AND w.main_category = _main_category THEN 50 ELSE 0 END
         + CASE WHEN _search IS NOT NULL AND _search <> '' AND (
              w.name ILIKE '%'||_search||'%' OR w.profession ILIKE '%'||_search||'%'
              OR w.main_category ILIKE '%'||_search||'%' OR w.sub_category ILIKE '%'||_search||'%'
           ) THEN 25 ELSE 0 END
         )::int AS match_score
  FROM ad_campaigns c
  JOIN ad_geo_targets g ON g.campaign_id = c.id
  JOIN workers w ON w.id = c.worker_id
  WHERE c.status = 'active'
    AND c.placement_type = 'explore'
    AND c.starts_at <= now() AND c.ends_at >= now()
    AND ST_DWithin(g.center, v_viewer, g.radius_km * 1000)
    AND (_radius_km IS NULL OR ST_DWithin(g.center, v_viewer, _radius_km * 1000))
    AND NOT (c.id = ANY(COALESCE(_exclude_campaign_ids, '{}'::uuid[])))
    AND (
      _main_category IS NULL AND _sub_category IS NULL
      OR (_sub_category IS NOT NULL AND (w.sub_category = _sub_category OR w.main_category = _sub_category))
      OR (_main_category IS NOT NULL AND (w.main_category = _main_category OR w.sub_category = _main_category))
    )
  ORDER BY match_score DESC, c.priority DESC, dkm ASC, c.created_at DESC
  LIMIT _limit OFFSET _offset;
END $function$;