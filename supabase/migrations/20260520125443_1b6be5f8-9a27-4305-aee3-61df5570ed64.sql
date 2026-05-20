
-- 1. Enum
DO $$ BEGIN
  CREATE TYPE public.ad_placement AS ENUM ('homepage','explore');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Column
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS placement_type public.ad_placement NOT NULL DEFAULT 'homepage';

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_placement_active
  ON public.ad_campaigns (placement_type, status, ends_at);

-- 3. create_ad_campaign with placement
CREATE OR REPLACE FUNCTION public.create_ad_campaign(
  _worker_id uuid,
  _ad_type ad_type,
  _duration_days integer,
  _radius_km integer,
  _center_lat double precision,
  _center_lng double precision,
  _country text DEFAULT NULL,
  _city text DEFAULT NULL,
  _area text DEFAULT NULL,
  _placement_type ad_placement DEFAULT 'homepage'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid; v_cost int; v_campaign_id uuid; v_ends timestamptz; v_bal int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  SELECT user_id INTO v_owner FROM workers WHERE id = _worker_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'WORKER_NOT_FOUND'; END IF;
  IF v_owner <> auth.uid() AND NOT has_role('admin'::app_role, auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF _duration_days NOT IN (1,7,15,30) THEN RAISE EXCEPTION 'INVALID_DURATION'; END IF;
  IF _radius_km <= 0 THEN RAISE EXCEPTION 'INVALID_RADIUS'; END IF;

  v_cost := calc_sparks_cost(_ad_type, _radius_km, _duration_days);
  v_ends := now() + (_duration_days::text || ' days')::interval;

  INSERT INTO sparks_wallets(owner_user_id, balance) VALUES (v_owner, 0)
    ON CONFLICT (owner_user_id) DO NOTHING;

  UPDATE sparks_wallets
     SET balance = balance - v_cost,
         total_spent = total_spent + v_cost,
         updated_at = now()
   WHERE owner_user_id = v_owner AND balance >= v_cost
   RETURNING balance INTO v_bal;
  IF v_bal IS NULL THEN RAISE EXCEPTION 'INSUFFICIENT_SPARKS'; END IF;

  INSERT INTO ad_campaigns(worker_id, owner_user_id, ad_type, status, duration_days, starts_at, ends_at, sparks_cost, placement_type)
  VALUES (_worker_id, v_owner, _ad_type, 'active', _duration_days, now(), v_ends, v_cost, _placement_type)
  RETURNING id INTO v_campaign_id;

  INSERT INTO ad_geo_targets(campaign_id, center, radius_km, country, city, area)
  VALUES (
    v_campaign_id,
    ST_SetSRID(ST_MakePoint(_center_lng, _center_lat), 4326)::geography,
    _radius_km, _country, _city, _area
  );

  INSERT INTO sparks_transactions(owner_user_id, worker_id, delta, reason, campaign_id, status)
  VALUES (v_owner, _worker_id, -v_cost, 'ad_spent'::sparks_reason, v_campaign_id, 'completed');

  RETURN v_campaign_id;
END $function$;

-- 4. get_promoted_workers — filter by placement (default homepage)
CREATE OR REPLACE FUNCTION public.get_promoted_workers(
  _viewer_lat double precision,
  _viewer_lng double precision,
  _max_viewer_radius_km integer DEFAULT NULL,
  _limit integer DEFAULT 12,
  _placement ad_placement DEFAULT 'homepage'
)
RETURNS TABLE(campaign_id uuid, worker_id uuid, user_id uuid, distance_km double precision, priority integer, ends_at timestamp with time zone)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_viewer geography;
BEGIN
  IF _viewer_lat IS NULL OR _viewer_lng IS NULL THEN RETURN; END IF;
  v_viewer := ST_SetSRID(ST_MakePoint(_viewer_lng, _viewer_lat), 4326)::geography;
  RETURN QUERY
  SELECT c.id, c.worker_id, c.owner_user_id,
         ST_Distance(g.center, v_viewer) / 1000.0,
         c.priority, c.ends_at
  FROM ad_campaigns c
  JOIN ad_geo_targets g ON g.campaign_id = c.id
  WHERE c.status = 'active'
    AND c.placement_type = _placement
    AND c.starts_at <= now() AND c.ends_at >= now()
    AND ST_DWithin(g.center, v_viewer, g.radius_km * 1000)
    AND (_max_viewer_radius_km IS NULL OR ST_DWithin(g.center, v_viewer, _max_viewer_radius_km * 1000))
  ORDER BY c.priority DESC, distance_km ASC
  LIMIT _limit;
END $function$;

-- 5. get_top_rated_promoted — also filter homepage placement
CREATE OR REPLACE FUNCTION public.get_top_rated_promoted(
  _viewer_lat double precision,
  _viewer_lng double precision,
  _limit integer DEFAULT 12,
  _placement ad_placement DEFAULT 'homepage'
)
RETURNS TABLE(campaign_id uuid, worker_id uuid, user_id uuid, distance_km double precision, priority integer, ends_at timestamp with time zone, avg_rating numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_viewer geography;
BEGIN
  IF _viewer_lat IS NULL OR _viewer_lng IS NULL THEN RETURN; END IF;
  v_viewer := ST_SetSRID(ST_MakePoint(_viewer_lng, _viewer_lat), 4326)::geography;
  RETURN QUERY
  SELECT c.id, c.worker_id, c.owner_user_id,
         ST_Distance(g.center, v_viewer) / 1000.0,
         c.priority, c.ends_at,
         COALESCE((SELECT AVG(r.rating)::numeric FROM reviews r WHERE r.worker_id = c.worker_id), 0)
  FROM ad_campaigns c
  JOIN ad_geo_targets g ON g.campaign_id = c.id
  WHERE c.status = 'active'
    AND c.placement_type = _placement
    AND c.starts_at <= now() AND c.ends_at >= now()
    AND ST_DWithin(g.center, v_viewer, g.radius_km * 1000)
  ORDER BY avg_rating DESC NULLS LAST, c.priority DESC
  LIMIT _limit;
END $function$;

-- 6. Paginated explore RPC
CREATE OR REPLACE FUNCTION public.get_promoted_explore(
  _viewer_lat double precision,
  _viewer_lng double precision,
  _limit integer DEFAULT 8,
  _offset integer DEFAULT 0,
  _exclude_campaign_ids uuid[] DEFAULT '{}'
)
RETURNS TABLE(campaign_id uuid, worker_id uuid, user_id uuid, distance_km double precision, priority integer, ends_at timestamp with time zone)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_viewer geography;
BEGIN
  IF _viewer_lat IS NULL OR _viewer_lng IS NULL THEN RETURN; END IF;
  v_viewer := ST_SetSRID(ST_MakePoint(_viewer_lng, _viewer_lat), 4326)::geography;
  RETURN QUERY
  SELECT c.id, c.worker_id, c.owner_user_id,
         ST_Distance(g.center, v_viewer) / 1000.0,
         c.priority, c.ends_at
  FROM ad_campaigns c
  JOIN ad_geo_targets g ON g.campaign_id = c.id
  WHERE c.status = 'active'
    AND c.placement_type = 'explore'
    AND c.starts_at <= now() AND c.ends_at >= now()
    AND ST_DWithin(g.center, v_viewer, g.radius_km * 1000)
    AND NOT (c.id = ANY(COALESCE(_exclude_campaign_ids, '{}'::uuid[])))
  ORDER BY c.priority DESC, distance_km ASC, c.created_at DESC
  LIMIT _limit OFFSET _offset;
END $function$;
