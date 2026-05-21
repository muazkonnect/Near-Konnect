
DROP FUNCTION IF EXISTS public.get_promoted_workers(double precision, double precision, integer, integer, ad_placement);
DROP FUNCTION IF EXISTS public.get_top_rated_promoted(double precision, double precision, integer, ad_placement);
DROP FUNCTION IF EXISTS public.get_promoted_explore(double precision, double precision, integer, integer, uuid[], text, text, text, integer);

CREATE FUNCTION public.get_promoted_workers(_viewer_lat double precision, _viewer_lng double precision, _max_viewer_radius_km integer DEFAULT NULL::integer, _limit integer DEFAULT 12, _placement ad_placement DEFAULT 'homepage'::ad_placement)
 RETURNS TABLE(campaign_id uuid, worker_id uuid, user_id uuid, distance_km double precision, priority integer, ends_at timestamp with time zone)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_viewer geography;
BEGIN
  IF _viewer_lat IS NOT NULL AND _viewer_lng IS NOT NULL THEN
    v_viewer := ST_SetSRID(ST_MakePoint(_viewer_lng, _viewer_lat), 4326)::geography;
  END IF;
  RETURN QUERY
  SELECT c.id, c.worker_id, c.owner_user_id,
         COALESCE(ST_Distance(g.center, v_viewer) / 1000.0, 0)::double precision,
         c.priority, c.ends_at
  FROM ad_campaigns c
  JOIN ad_geo_targets g ON g.campaign_id = c.id
  WHERE c.status = 'active'
    AND c.placement_type = _placement
    AND c.starts_at <= now() AND c.ends_at >= now()
  ORDER BY c.priority DESC, COALESCE(ST_Distance(g.center, v_viewer), 0) ASC
  LIMIT _limit;
END $$;

CREATE FUNCTION public.get_top_rated_promoted(_viewer_lat double precision, _viewer_lng double precision, _limit integer DEFAULT 12, _placement ad_placement DEFAULT 'homepage'::ad_placement)
 RETURNS TABLE(campaign_id uuid, worker_id uuid, user_id uuid, distance_km double precision, priority integer, ends_at timestamp with time zone, avg_rating double precision)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_viewer geography;
BEGIN
  IF _viewer_lat IS NOT NULL AND _viewer_lng IS NOT NULL THEN
    v_viewer := ST_SetSRID(ST_MakePoint(_viewer_lng, _viewer_lat), 4326)::geography;
  END IF;
  RETURN QUERY
  SELECT c.id, c.worker_id, c.owner_user_id,
         COALESCE(ST_Distance(g.center, v_viewer) / 1000.0, 0)::double precision,
         c.priority, c.ends_at,
         COALESCE((SELECT AVG(r.rating)::double precision FROM reviews r WHERE r.worker_id = c.worker_id), 0)
  FROM ad_campaigns c
  JOIN ad_geo_targets g ON g.campaign_id = c.id
  WHERE c.status = 'active'
    AND c.placement_type = _placement
    AND c.starts_at <= now() AND c.ends_at >= now()
  ORDER BY COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.worker_id = c.worker_id), 0) DESC,
           c.priority DESC
  LIMIT _limit;
END $$;

CREATE FUNCTION public.get_promoted_explore(_viewer_lat double precision, _viewer_lng double precision, _limit integer DEFAULT 8, _offset integer DEFAULT 0, _exclude_campaign_ids uuid[] DEFAULT ARRAY[]::uuid[], _main_category text DEFAULT NULL::text, _sub_category text DEFAULT NULL::text, _search text DEFAULT NULL::text, _radius_km integer DEFAULT NULL::integer)
 RETURNS TABLE(campaign_id uuid, worker_id uuid, user_id uuid, distance_km double precision, priority integer, ends_at timestamp with time zone)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_viewer geography;
BEGIN
  IF _viewer_lat IS NOT NULL AND _viewer_lng IS NOT NULL THEN
    v_viewer := ST_SetSRID(ST_MakePoint(_viewer_lng, _viewer_lat), 4326)::geography;
  END IF;
  RETURN QUERY
  SELECT c.id, c.worker_id, c.owner_user_id,
         COALESCE(ST_Distance(g.center, v_viewer) / 1000.0, 0)::double precision,
         c.priority, c.ends_at
  FROM ad_campaigns c
  JOIN ad_geo_targets g ON g.campaign_id = c.id
  JOIN workers w ON w.id = c.worker_id
  WHERE c.status = 'active'
    AND c.placement_type = 'explore'
    AND c.starts_at <= now() AND c.ends_at >= now()
    AND (_exclude_campaign_ids IS NULL OR NOT (c.id = ANY(_exclude_campaign_ids)))
    AND (_main_category IS NULL OR w.main_category = _main_category OR w.sub_category = _main_category)
    AND (_sub_category IS NULL OR w.sub_category = _sub_category)
    AND (
      _search IS NULL OR
      w.name ILIKE '%' || _search || '%' OR
      w.profession ILIKE '%' || _search || '%' OR
      w.main_category ILIKE '%' || _search || '%' OR
      w.sub_category ILIKE '%' || _search || '%'
    )
    AND (
      _radius_km IS NULL OR v_viewer IS NULL OR
      ST_DWithin(g.center, v_viewer, _radius_km * 1000)
    )
  ORDER BY c.priority DESC, COALESCE(ST_Distance(g.center, v_viewer), 0) ASC
  LIMIT _limit OFFSET _offset;
END $$;
