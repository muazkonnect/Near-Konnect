
-- =================== Tier system ===================
CREATE TABLE IF NOT EXISTS public.tier_settings (
  tier int PRIMARY KEY CHECK (tier BETWEEN 1 AND 3),
  multiplier numeric NOT NULL CHECK (multiplier >= 1),
  label text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.tier_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads tier settings" ON public.tier_settings;
CREATE POLICY "Anyone reads tier settings" ON public.tier_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage tier settings" ON public.tier_settings;
CREATE POLICY "Admins manage tier settings" ON public.tier_settings FOR ALL TO authenticated
  USING (has_role('admin'::app_role, auth.uid())) WITH CHECK (has_role('admin'::app_role, auth.uid()));

INSERT INTO public.tier_settings (tier, multiplier, label) VALUES
  (1, 1.0, 'Tier 1'), (2, 3.0, 'Tier 2'), (3, 5.0, 'Tier 3')
ON CONFLICT (tier) DO UPDATE SET multiplier = EXCLUDED.multiplier, label = EXCLUDED.label, updated_at = now();

CREATE TABLE IF NOT EXISTS public.country_tiers (
  country_code text PRIMARY KEY,
  tier int NOT NULL CHECK (tier BETWEEN 1 AND 3),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.country_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads country tiers" ON public.country_tiers;
CREATE POLICY "Anyone reads country tiers" ON public.country_tiers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage country tiers" ON public.country_tiers;
CREATE POLICY "Admins manage country tiers" ON public.country_tiers FOR ALL TO authenticated
  USING (has_role('admin'::app_role, auth.uid())) WITH CHECK (has_role('admin'::app_role, auth.uid()));

-- Tier 2 seed
INSERT INTO public.country_tiers (country_code, tier) VALUES
  ('AE',2),('SA',2),('QA',2),('KW',2),('BH',2),('OM',2),('MY',2),('TR',2),('ZA',2),('BR',2),
  ('MX',2),('AR',2),('TH',2),('CN',2),('RU',2),('KZ',2),('AZ',2),('RO',2),('BG',2),('PL',2)
ON CONFLICT (country_code) DO UPDATE SET tier = EXCLUDED.tier, updated_at = now();

-- Tier 3 seed
INSERT INTO public.country_tiers (country_code, tier) VALUES
  ('US',3),('CA',3),('GB',3),('DE',3),('FR',3),('IT',3),('ES',3),('NL',3),('BE',3),('CH',3),
  ('SE',3),('NO',3),('DK',3),('FI',3),('AU',3),('NZ',3),('IE',3),('AT',3),('SG',3),('JP',3)
ON CONFLICT (country_code) DO UPDATE SET tier = EXCLUDED.tier, updated_at = now();

-- Profile fixed country
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code text;

-- =================== Helpers ===================
CREATE OR REPLACE FUNCTION public.country_to_tier(_cc text)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT tier FROM public.country_tiers WHERE country_code = UPPER(_cc)), 1);
$$;

CREATE OR REPLACE FUNCTION public.tier_multiplier(_tier int)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT multiplier FROM public.tier_settings WHERE tier = _tier), 1.0);
$$;

CREATE OR REPLACE FUNCTION public.resolve_user_tier(_uid uuid, _current_cc text DEFAULT NULL)
RETURNS int LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_fixed text; v_t1 int; v_t2 int;
BEGIN
  IF _uid IS NOT NULL THEN
    SELECT country_code INTO v_fixed FROM public.profiles WHERE user_id = _uid LIMIT 1;
  END IF;
  v_t1 := public.country_to_tier(v_fixed);
  v_t2 := public.country_to_tier(_current_cc);
  RETURN GREATEST(v_t1, v_t2);
END $$;

CREATE OR REPLACE FUNCTION public.apply_tier(_uid uuid, _current_cc text, _base_cost int)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CEIL(_base_cost * public.tier_multiplier(public.resolve_user_tier(_uid, _current_cc)))::int;
$$;

GRANT EXECUTE ON FUNCTION public.country_to_tier(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tier_multiplier(int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_user_tier(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_tier(uuid, text, int) TO authenticated;

-- =================== calc_sparks_cost (tier-aware) ===================
DROP FUNCTION IF EXISTS public.calc_sparks_cost(ad_type, integer, integer, ad_placement);
CREATE OR REPLACE FUNCTION public.calc_sparks_cost(
  _ad_type ad_type,
  _radius_km integer,
  _duration_days integer,
  _placement_type ad_placement DEFAULT 'homepage'::ad_placement,
  _current_cc text DEFAULT NULL
)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_per_km numeric; v_paid_days int; v_map jsonb; v_base int;
BEGIN
  SELECT value INTO v_map FROM ad_pricing_rules WHERE key = 'per_km_by_placement' AND active LIMIT 1;
  v_per_km := COALESCE((v_map ->> _placement_type::text)::numeric,
                       CASE WHEN _placement_type = 'homepage' THEN 3 ELSE 2 END);
  SELECT paid_days INTO v_paid_days FROM ad_duration_discounts WHERE duration_days = _duration_days;
  IF v_paid_days IS NULL THEN v_paid_days := _duration_days; END IF;
  v_base := CEIL(v_per_km * GREATEST(_radius_km, 1) * v_paid_days)::int;
  RETURN public.apply_tier(auth.uid(), _current_cc, v_base);
END $$;
GRANT EXECUTE ON FUNCTION public.calc_sparks_cost(ad_type, integer, integer, ad_placement, text) TO anon, authenticated;

-- =================== create_ad_campaign (tier-aware) ===================
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
  _placement_type ad_placement DEFAULT 'homepage',
  _current_cc text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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

  -- calc_sparks_cost already applies tier for auth.uid() + _current_cc
  v_cost := calc_sparks_cost(_ad_type, _radius_km, _duration_days, _placement_type, _current_cc);
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
  VALUES (v_campaign_id, ST_SetSRID(ST_MakePoint(_center_lng, _center_lat), 4326)::geography,
          _radius_km, _country, _city, _area);

  INSERT INTO sparks_transactions(owner_user_id, worker_id, delta, reason, campaign_id, status)
  VALUES (v_owner, _worker_id, -v_cost, 'ad_spent'::sparks_reason, v_campaign_id, 'completed');

  RETURN v_campaign_id;
END $function$;

-- =================== purchase_featured (tier-aware) ===================
CREATE OR REPLACE FUNCTION public.purchase_featured(
  p_duration_days integer,
  p_category_id uuid DEFAULT NULL::uuid,
  p_current_cc text DEFAULT NULL
)
RETURNS featured_workers LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_worker workers%ROWTYPE;
  v_prof profiles%ROWTYPE;
  v_cost integer; v_base integer;
  v_rule featured_pricing_rules%ROWTYPE;
  v_row featured_workers%ROWTYPE;
  v_lat double precision; v_lng double precision;
  v_radius integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_duration_days <> 30 THEN RAISE EXCEPTION 'Featured is monthly only (30 days)'; END IF;
  SELECT * INTO v_worker FROM public.workers WHERE user_id = v_uid LIMIT 1;
  IF v_worker.id IS NULL THEN RAISE EXCEPTION 'Worker profile required'; END IF;
  SELECT * INTO v_prof FROM public.profiles WHERE user_id = v_uid LIMIT 1;
  v_lat := COALESCE(v_worker.latitude, v_prof.latitude);
  v_lng := COALESCE(v_worker.longitude, v_prof.longitude);
  IF v_lat IS NULL OR v_lng IS NULL THEN RAISE EXCEPTION 'Set your location before becoming featured'; END IF;

  SELECT * INTO v_rule FROM public.featured_pricing_rules
    WHERE active AND duration_days = 30
      AND (category_id = p_category_id OR (category_id IS NULL AND p_category_id IS NULL))
    ORDER BY (category_id IS NOT NULL) DESC LIMIT 1;
  IF v_rule.id IS NULL THEN
    SELECT * INTO v_rule FROM public.featured_pricing_rules
      WHERE active AND duration_days = 30 AND category_id IS NULL LIMIT 1;
  END IF;
  IF v_rule.id IS NULL THEN RAISE EXCEPTION 'No pricing rule for monthly'; END IF;
  v_base := CEIL(v_rule.base_sparks * v_rule.multiplier)::int;
  v_cost := public.apply_tier(v_uid, p_current_cc, v_base);

  SELECT NULLIF(value::text, 'null')::int INTO v_radius
    FROM public.app_settings WHERE key = 'featured_default_radius_km';
  IF v_radius IS NULL OR v_radius <= 0 THEN v_radius := 3; END IF;

  PERFORM public.spend_sparks(v_cost, 'featured', 'Featured worker monthly', NULL);

  INSERT INTO public.featured_workers (worker_id, user_id, category_id, duration_days, sparks_cost,
                                       ends_at, status, center, radius_km)
    VALUES (v_worker.id, v_uid, p_category_id, 30, v_cost,
            now() + interval '30 days', 'active',
            ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326)::geography, v_radius)
    RETURNING * INTO v_row;
  RETURN v_row;
END; $function$;

-- =================== submit_verification (tier-aware) ===================
CREATE OR REPLACE FUNCTION public.submit_verification(
  p_inquiry_id text, p_session_token text DEFAULT NULL, p_current_cc text DEFAULT NULL
) RETURNS public.worker_verifications LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row worker_verifications%ROWTYPE; v_cost int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_row FROM public.worker_verifications WHERE user_id = v_uid;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Start verification first'; END IF;
  IF v_row.status = 'approved' THEN RAISE EXCEPTION 'Already verified'; END IF;
  IF v_row.submitted_at IS NULL THEN
    v_cost := public.apply_tier(v_uid, p_current_cc, COALESCE(v_row.sparks_cost, 0));
    IF v_cost > 0 THEN PERFORM public.spend_sparks(v_cost, 'verification', 'Worker verification', NULL); END IF;
    UPDATE public.worker_verifications SET sparks_cost = v_cost WHERE id = v_row.id;
  END IF;
  UPDATE public.worker_verifications
    SET persona_inquiry_id = p_inquiry_id,
        persona_session_token = p_session_token,
        status = 'submitted',
        submitted_at = COALESCE(submitted_at, now()),
        updated_at = now()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.submit_verification(text, text, text) TO authenticated;
