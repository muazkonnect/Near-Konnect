CREATE OR REPLACE FUNCTION public.get_top_rated_promoted(
  _viewer_lat double precision,
  _viewer_lng double precision,
  _limit integer DEFAULT 12,
  _placement ad_placement DEFAULT 'homepage'::ad_placement
)
RETURNS TABLE(campaign_id uuid, worker_id uuid, user_id uuid, distance_km double precision, priority integer, ends_at timestamp with time zone, avg_rating numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_viewer geography; v_max_km integer := 3;
BEGIN
  IF _viewer_lat IS NULL OR _viewer_lng IS NULL THEN RETURN; END IF;
  v_viewer := ST_SetSRID(ST_MakePoint(_viewer_lng, _viewer_lat), 4326)::geography;
  RETURN QUERY
  SELECT c.id, c.worker_id, c.owner_user_id,
         (ST_Distance(g.center, v_viewer) / 1000.0)::double precision,
         c.priority, c.ends_at,
         COALESCE(AVG(r.rating)::numeric, 0)
  FROM ad_campaigns c
  JOIN ad_geo_targets g ON g.campaign_id = c.id
  LEFT JOIN reviews r ON r.worker_id = c.worker_id
  WHERE c.status = 'active'
    AND c.placement_type = _placement
    AND c.starts_at <= now() AND c.ends_at >= now()
    AND ST_DWithin(g.center, v_viewer, g.radius_km * 1000)
    AND ST_DWithin(g.center, v_viewer, v_max_km * 1000)
  GROUP BY c.id, g.center, g.radius_km
  ORDER BY COALESCE(AVG(r.rating), 0) DESC, c.priority DESC
  LIMIT _limit;
END $function$;