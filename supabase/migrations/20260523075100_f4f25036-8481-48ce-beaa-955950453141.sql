
-- ============ Featured: monthly-only at 30 Sparks ============
UPDATE public.featured_pricing_rules SET active = false WHERE duration_days <> 30;
INSERT INTO public.featured_pricing_rules (duration_days, category_id, base_sparks, multiplier, active)
SELECT 30, NULL, 30, 1.0, true
WHERE NOT EXISTS (SELECT 1 FROM public.featured_pricing_rules WHERE duration_days = 30 AND category_id IS NULL);
UPDATE public.featured_pricing_rules SET base_sparks = 30, multiplier = 1.0, active = true
WHERE duration_days = 30 AND category_id IS NULL;

-- Restrict purchase_featured to monthly only
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
  v_cost := CEIL(v_rule.base_sparks * v_rule.multiplier)::int;

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

-- ============ Ad pricing: per-km by placement ============
INSERT INTO public.ad_pricing_rules (key, value, active)
VALUES ('per_km_by_placement', '{"homepage": 3, "explore": 2}'::jsonb, true)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, active = true, updated_at = now();

-- ============ Discounts table ============
CREATE TABLE IF NOT EXISTS public.ad_duration_discounts (
  duration_days integer PRIMARY KEY,
  paid_days integer NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_duration_discounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads ad duration discounts" ON public.ad_duration_discounts;
CREATE POLICY "Anyone reads ad duration discounts" ON public.ad_duration_discounts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage ad duration discounts" ON public.ad_duration_discounts;
CREATE POLICY "Admins manage ad duration discounts" ON public.ad_duration_discounts
  FOR ALL TO authenticated
  USING (has_role('admin'::app_role, auth.uid()))
  WITH CHECK (has_role('admin'::app_role, auth.uid()));

INSERT INTO public.ad_duration_discounts (duration_days, paid_days) VALUES
  (1, 1), (7, 5), (15, 12), (30, 22)
ON CONFLICT (duration_days) DO UPDATE SET paid_days = EXCLUDED.paid_days, updated_at = now();

-- ============ Replace calc_sparks_cost: per-km × radius × paid_days ============
DROP FUNCTION IF EXISTS public.calc_sparks_cost(ad_type, integer, integer);
DROP FUNCTION IF EXISTS public.calc_sparks_cost(ad_type, integer, integer, ad_placement);

CREATE OR REPLACE FUNCTION public.calc_sparks_cost(
  _ad_type ad_type,
  _radius_km integer,
  _duration_days integer,
  _placement_type ad_placement DEFAULT 'homepage'::ad_placement
)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_per_km numeric;
  v_paid_days integer;
  v_map jsonb;
BEGIN
  SELECT value INTO v_map FROM ad_pricing_rules WHERE key = 'per_km_by_placement' AND active LIMIT 1;
  v_per_km := COALESCE((v_map ->> _placement_type::text)::numeric,
                       CASE WHEN _placement_type = 'homepage' THEN 3 ELSE 2 END);

  SELECT paid_days INTO v_paid_days FROM ad_duration_discounts WHERE duration_days = _duration_days;
  IF v_paid_days IS NULL THEN v_paid_days := _duration_days; END IF;

  RETURN CEIL(v_per_km * GREATEST(_radius_km, 1) * v_paid_days)::int;
END $function$;
