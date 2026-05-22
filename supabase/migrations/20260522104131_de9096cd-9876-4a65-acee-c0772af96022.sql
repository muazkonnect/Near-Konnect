CREATE OR REPLACE FUNCTION public.purchase_featured(p_duration_days integer, p_category_id uuid DEFAULT NULL::uuid)
 RETURNS featured_workers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_worker workers%ROWTYPE;
  v_prof profiles%ROWTYPE;
  v_cost integer;
  v_rule featured_pricing_rules%ROWTYPE;
  v_row featured_workers%ROWTYPE;
  v_lat double precision; v_lng double precision;
  v_radius integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_duration_days NOT IN (1,7,15,30) THEN RAISE EXCEPTION 'Invalid duration'; END IF;
  SELECT * INTO v_worker FROM public.workers WHERE user_id = v_uid LIMIT 1;
  IF v_worker.id IS NULL THEN RAISE EXCEPTION 'Worker profile required'; END IF;
  SELECT * INTO v_prof FROM public.profiles WHERE user_id = v_uid LIMIT 1;
  v_lat := COALESCE(v_worker.latitude, v_prof.latitude);
  v_lng := COALESCE(v_worker.longitude, v_prof.longitude);
  IF v_lat IS NULL OR v_lng IS NULL THEN RAISE EXCEPTION 'Set your location before becoming featured'; END IF;

  SELECT * INTO v_rule FROM public.featured_pricing_rules
    WHERE active AND duration_days = p_duration_days
      AND (category_id = p_category_id OR (category_id IS NULL AND p_category_id IS NULL))
    ORDER BY (category_id IS NOT NULL) DESC LIMIT 1;
  IF v_rule.id IS NULL THEN
    SELECT * INTO v_rule FROM public.featured_pricing_rules
      WHERE active AND duration_days = p_duration_days AND category_id IS NULL LIMIT 1;
  END IF;
  IF v_rule.id IS NULL THEN RAISE EXCEPTION 'No pricing rule for this duration'; END IF;
  v_cost := CEIL(v_rule.base_sparks * v_rule.multiplier)::int;

  SELECT NULLIF(value::text, 'null')::int INTO v_radius
    FROM public.app_settings WHERE key = 'featured_default_radius_km';
  IF v_radius IS NULL OR v_radius <= 0 THEN v_radius := 3; END IF;

  PERFORM public.spend_sparks(v_cost, 'featured', 'Featured worker '||p_duration_days||'d', NULL);

  INSERT INTO public.featured_workers (worker_id, user_id, category_id, duration_days, sparks_cost,
                                       ends_at, status, center, radius_km)
    VALUES (v_worker.id, v_uid, p_category_id, p_duration_days, v_cost,
            now() + (p_duration_days::text || ' days')::interval, 'active',
            ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326)::geography, v_radius)
    RETURNING * INTO v_row;
  RETURN v_row;
END; $function$;