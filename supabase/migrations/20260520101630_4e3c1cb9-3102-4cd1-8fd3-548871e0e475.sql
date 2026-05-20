
-- ============ Extensions ============
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============ Enums ============
DO $$ BEGIN
  CREATE TYPE public.ad_type AS ENUM ('local', 'international');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_status AS ENUM ('active', 'paused', 'expired', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sparks_reason AS ENUM ('admin_grant', 'campaign_spend', 'refund', 'admin_adjust');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ Tables ============
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  ad_type public.ad_type NOT NULL,
  status public.ad_status NOT NULL DEFAULT 'active',
  duration_days int NOT NULL CHECK (duration_days IN (1,7,15,30)),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  sparks_cost int NOT NULL DEFAULT 0,
  priority int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status_window ON public.ad_campaigns (status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_owner ON public.ad_campaigns (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_worker ON public.ad_campaigns (worker_id);

CREATE TABLE IF NOT EXISTS public.ad_geo_targets (
  campaign_id uuid PRIMARY KEY REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  center geography(Point, 4326) NOT NULL,
  radius_km int NOT NULL CHECK (radius_km > 0 AND radius_km <= 5000),
  country text,
  city text,
  area text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_geo_targets_center ON public.ad_geo_targets USING GIST (center);

CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  viewer_user_id uuid,
  viewer_point geography(Point, 4326),
  placement text,
  hour_bucket timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_campaign ON public.ad_impressions (campaign_id, created_at DESC);
-- Dedupe authenticated impressions per hour
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ad_impressions_user_hour
  ON public.ad_impressions (campaign_id, viewer_user_id, hour_bucket)
  WHERE viewer_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  viewer_user_id uuid,
  viewer_point geography(Point, 4326),
  placement text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_campaign ON public.ad_clicks (campaign_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.sparks_wallets (
  worker_id uuid PRIMARY KEY,
  owner_user_id uuid NOT NULL,
  balance int NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sparks_wallets_owner ON public.sparks_wallets (owner_user_id);

CREATE TABLE IF NOT EXISTS public.sparks_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  delta int NOT NULL,
  reason public.sparks_reason NOT NULL,
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sparks_tx_worker ON public.sparks_transactions (worker_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ad_pricing_rules (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default pricing
INSERT INTO public.ad_pricing_rules (key, value) VALUES
  ('base', '{"local": 50, "international": 200}'::jsonb),
  ('radius_multiplier', '{"5": 1.0, "10": 1.6, "15": 2.2}'::jsonb),
  ('duration_multiplier', '{"1": 1.0, "7": 5.5, "15": 10.0, "30": 18.0}'::jsonb),
  ('international_radius_multiplier', '{"per_km": 0.05, "min": 1.0, "max": 6.0}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============ RLS ============
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_geo_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sparks_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sparks_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_pricing_rules ENABLE ROW LEVEL SECURITY;

-- ad_campaigns
DROP POLICY IF EXISTS "Owners and admins can view campaigns" ON public.ad_campaigns;
CREATE POLICY "Owners and admins can view campaigns" ON public.ad_campaigns
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role('admin'::app_role, auth.uid()));

DROP POLICY IF EXISTS "Public can view active campaigns" ON public.ad_campaigns;
CREATE POLICY "Public can view active campaigns" ON public.ad_campaigns
  FOR SELECT TO anon, authenticated
  USING (status = 'active' AND starts_at <= now() AND ends_at >= now());

DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.ad_campaigns;
CREATE POLICY "Admins can manage campaigns" ON public.ad_campaigns
  FOR ALL TO authenticated
  USING (public.has_role('admin'::app_role, auth.uid()))
  WITH CHECK (public.has_role('admin'::app_role, auth.uid()));

-- ad_geo_targets
DROP POLICY IF EXISTS "Anyone can view geo targets of visible campaigns" ON public.ad_geo_targets;
CREATE POLICY "Anyone can view geo targets of visible campaigns" ON public.ad_geo_targets
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.ad_campaigns c WHERE c.id = campaign_id));

DROP POLICY IF EXISTS "Admins can manage geo targets" ON public.ad_geo_targets;
CREATE POLICY "Admins can manage geo targets" ON public.ad_geo_targets
  FOR ALL TO authenticated
  USING (public.has_role('admin'::app_role, auth.uid()))
  WITH CHECK (public.has_role('admin'::app_role, auth.uid()));

-- ad_impressions
DROP POLICY IF EXISTS "Anyone can record impressions" ON public.ad_impressions;
CREATE POLICY "Anyone can record impressions" ON public.ad_impressions
  FOR INSERT TO anon, authenticated
  WITH CHECK (campaign_id IS NOT NULL);

DROP POLICY IF EXISTS "Owners and admins can read impressions" ON public.ad_impressions;
CREATE POLICY "Owners and admins can read impressions" ON public.ad_impressions
  FOR SELECT TO authenticated
  USING (
    public.has_role('admin'::app_role, auth.uid())
    OR EXISTS (SELECT 1 FROM public.ad_campaigns c WHERE c.id = campaign_id AND c.owner_user_id = auth.uid())
  );

-- ad_clicks (mirror of impressions)
DROP POLICY IF EXISTS "Anyone can record clicks" ON public.ad_clicks;
CREATE POLICY "Anyone can record clicks" ON public.ad_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (campaign_id IS NOT NULL);

DROP POLICY IF EXISTS "Owners and admins can read clicks" ON public.ad_clicks;
CREATE POLICY "Owners and admins can read clicks" ON public.ad_clicks
  FOR SELECT TO authenticated
  USING (
    public.has_role('admin'::app_role, auth.uid())
    OR EXISTS (SELECT 1 FROM public.ad_campaigns c WHERE c.id = campaign_id AND c.owner_user_id = auth.uid())
  );

-- sparks_wallets — read for owner+admin; writes only via SECURITY DEFINER fns
DROP POLICY IF EXISTS "Owner and admin can view wallet" ON public.sparks_wallets;
CREATE POLICY "Owner and admin can view wallet" ON public.sparks_wallets
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role('admin'::app_role, auth.uid()));

-- sparks_transactions — read for owner+admin
DROP POLICY IF EXISTS "Owner and admin can view tx" ON public.sparks_transactions;
CREATE POLICY "Owner and admin can view tx" ON public.sparks_transactions
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role('admin'::app_role, auth.uid()));

-- ad_pricing_rules
DROP POLICY IF EXISTS "Anyone can read active pricing" ON public.ad_pricing_rules;
CREATE POLICY "Anyone can read active pricing" ON public.ad_pricing_rules
  FOR SELECT TO anon, authenticated
  USING (active = true OR public.has_role('admin'::app_role, auth.uid()));

DROP POLICY IF EXISTS "Admins can manage pricing" ON public.ad_pricing_rules;
CREATE POLICY "Admins can manage pricing" ON public.ad_pricing_rules
  FOR ALL TO authenticated
  USING (public.has_role('admin'::app_role, auth.uid()))
  WITH CHECK (public.has_role('admin'::app_role, auth.uid()));

-- ============ Functions ============

-- Generic update_updated_at trigger (reused)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_ad_campaigns_updated ON public.ad_campaigns;
CREATE TRIGGER trg_ad_campaigns_updated BEFORE UPDATE ON public.ad_campaigns
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_sparks_wallets_updated ON public.sparks_wallets;
CREATE TRIGGER trg_sparks_wallets_updated BEFORE UPDATE ON public.sparks_wallets
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Pricing calculator
CREATE OR REPLACE FUNCTION public.calc_sparks_cost(
  _ad_type public.ad_type,
  _radius_km int,
  _duration_days int
) RETURNS int
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_base numeric;
  v_radius numeric := 1.0;
  v_duration numeric := 1.0;
  v_intl jsonb;
BEGIN
  SELECT (value -> _ad_type::text)::numeric INTO v_base FROM ad_pricing_rules WHERE key='base';
  IF v_base IS NULL THEN v_base := 50; END IF;

  IF _ad_type = 'local' THEN
    SELECT COALESCE((value -> _radius_km::text)::numeric, 1.0) INTO v_radius
      FROM ad_pricing_rules WHERE key='radius_multiplier';
  ELSE
    SELECT value INTO v_intl FROM ad_pricing_rules WHERE key='international_radius_multiplier';
    v_radius := LEAST(
      GREATEST(
        COALESCE((v_intl->>'min')::numeric, 1.0),
        _radius_km * COALESCE((v_intl->>'per_km')::numeric, 0.05)
      ),
      COALESCE((v_intl->>'max')::numeric, 6.0)
    );
  END IF;

  SELECT COALESCE((value -> _duration_days::text)::numeric, _duration_days::numeric) INTO v_duration
    FROM ad_pricing_rules WHERE key='duration_multiplier';

  RETURN CEIL(v_base * v_radius * v_duration)::int;
END $$;

-- Atomic spend (internal)
CREATE OR REPLACE FUNCTION public._spend_sparks(
  _worker_id uuid,
  _owner_user_id uuid,
  _amount int,
  _reason public.sparks_reason,
  _campaign_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance int;
BEGIN
  INSERT INTO sparks_wallets(worker_id, owner_user_id, balance)
  VALUES (_worker_id, _owner_user_id, 0)
  ON CONFLICT (worker_id) DO NOTHING;

  UPDATE sparks_wallets SET balance = balance - _amount
  WHERE worker_id = _worker_id RETURNING balance INTO v_balance;

  IF v_balance IS NULL OR v_balance < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_SPARKS';
  END IF;

  INSERT INTO sparks_transactions(worker_id, owner_user_id, delta, reason, campaign_id)
  VALUES (_worker_id, _owner_user_id, -_amount, _reason, _campaign_id);
END $$;

-- Create campaign (atomic: spend + insert campaign + geo target)
CREATE OR REPLACE FUNCTION public.create_ad_campaign(
  _worker_id uuid,
  _ad_type public.ad_type,
  _duration_days int,
  _radius_km int,
  _center_lat double precision,
  _center_lng double precision,
  _country text DEFAULT NULL,
  _city text DEFAULT NULL,
  _area text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_cost int;
  v_campaign_id uuid;
  v_ends timestamptz;
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

  INSERT INTO ad_campaigns(worker_id, owner_user_id, ad_type, status, duration_days, starts_at, ends_at, sparks_cost)
  VALUES (_worker_id, v_owner, _ad_type, 'active', _duration_days, now(), v_ends, v_cost)
  RETURNING id INTO v_campaign_id;

  INSERT INTO ad_geo_targets(campaign_id, center, radius_km, country, city, area)
  VALUES (
    v_campaign_id,
    ST_SetSRID(ST_MakePoint(_center_lng, _center_lat), 4326)::geography,
    _radius_km, _country, _city, _area
  );

  PERFORM _spend_sparks(_worker_id, v_owner, v_cost, 'campaign_spend', v_campaign_id);
  RETURN v_campaign_id;
EXCEPTION WHEN OTHERS THEN
  -- Bubble up sparks error with cleanup
  IF SQLERRM = 'INSUFFICIENT_SPARKS' THEN
    DELETE FROM ad_campaigns WHERE id = v_campaign_id;
    RAISE;
  END IF;
  RAISE;
END $$;

-- Admin grant
CREATE OR REPLACE FUNCTION public.admin_grant_sparks(
  _worker_id uuid,
  _amount int,
  _notes text DEFAULT NULL
) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_balance int;
BEGIN
  IF NOT has_role('admin'::app_role, auth.uid()) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _amount = 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  SELECT user_id INTO v_owner FROM workers WHERE id = _worker_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'WORKER_NOT_FOUND'; END IF;

  INSERT INTO sparks_wallets(worker_id, owner_user_id, balance) VALUES (_worker_id, v_owner, 0)
  ON CONFLICT (worker_id) DO NOTHING;

  UPDATE sparks_wallets SET balance = GREATEST(0, balance + _amount)
  WHERE worker_id = _worker_id RETURNING balance INTO v_balance;

  INSERT INTO sparks_transactions(worker_id, owner_user_id, delta, reason, notes)
  VALUES (_worker_id, v_owner, _amount, CASE WHEN _amount>0 THEN 'admin_grant' ELSE 'admin_adjust' END, _notes);

  RETURN v_balance;
END $$;

-- Set campaign status (worker pause/resume; admin can do anything)
CREATE OR REPLACE FUNCTION public.set_campaign_status(
  _campaign_id uuid,
  _status public.ad_status
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_current public.ad_status;
BEGIN
  SELECT owner_user_id, status INTO v_owner, v_current FROM ad_campaigns WHERE id = _campaign_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_owner <> auth.uid() AND NOT has_role('admin'::app_role, auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF v_current = 'expired' AND NOT has_role('admin'::app_role, auth.uid()) THEN
    RAISE EXCEPTION 'EXPIRED';
  END IF;
  -- Workers can only pause/resume
  IF NOT has_role('admin'::app_role, auth.uid()) AND _status NOT IN ('active','paused') THEN
    RAISE EXCEPTION 'FORBIDDEN_STATUS';
  END IF;
  UPDATE ad_campaigns SET status = _status WHERE id = _campaign_id;
END $$;

-- Get promoted workers in a viewer location (campaign fence MUST contain the viewer).
-- _max_viewer_radius_km: optional upper bound on viewer→campaign-center distance (5/10/15 carousels).
CREATE OR REPLACE FUNCTION public.get_promoted_workers(
  _viewer_lat double precision,
  _viewer_lng double precision,
  _max_viewer_radius_km int DEFAULT NULL,
  _limit int DEFAULT 12
) RETURNS TABLE (
  campaign_id uuid,
  worker_id uuid,
  user_id uuid,
  distance_km double precision,
  priority int,
  ends_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_viewer geography;
BEGIN
  IF _viewer_lat IS NULL OR _viewer_lng IS NULL THEN RETURN; END IF;
  v_viewer := ST_SetSRID(ST_MakePoint(_viewer_lng, _viewer_lat), 4326)::geography;

  RETURN QUERY
  SELECT
    c.id, c.worker_id, c.owner_user_id,
    ST_Distance(g.center, v_viewer) / 1000.0 AS distance_km,
    c.priority, c.ends_at
  FROM ad_campaigns c
  JOIN ad_geo_targets g ON g.campaign_id = c.id
  WHERE c.status = 'active'
    AND c.starts_at <= now() AND c.ends_at >= now()
    AND ST_DWithin(g.center, v_viewer, g.radius_km * 1000)
    AND (_max_viewer_radius_km IS NULL OR ST_DWithin(g.center, v_viewer, _max_viewer_radius_km * 1000))
  ORDER BY c.priority DESC, distance_km ASC
  LIMIT _limit;
END $$;

CREATE OR REPLACE FUNCTION public.get_top_rated_promoted(
  _viewer_lat double precision,
  _viewer_lng double precision,
  _limit int DEFAULT 12
) RETURNS TABLE (
  campaign_id uuid,
  worker_id uuid,
  user_id uuid,
  distance_km double precision,
  priority int,
  ends_at timestamptz,
  avg_rating numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_viewer geography;
BEGIN
  IF _viewer_lat IS NULL OR _viewer_lng IS NULL THEN RETURN; END IF;
  v_viewer := ST_SetSRID(ST_MakePoint(_viewer_lng, _viewer_lat), 4326)::geography;

  RETURN QUERY
  SELECT
    c.id, c.worker_id, c.owner_user_id,
    ST_Distance(g.center, v_viewer) / 1000.0,
    c.priority, c.ends_at,
    COALESCE((SELECT AVG(r.rating)::numeric FROM reviews r WHERE r.worker_id = c.worker_id), 0)
  FROM ad_campaigns c
  JOIN ad_geo_targets g ON g.campaign_id = c.id
  WHERE c.status = 'active'
    AND c.starts_at <= now() AND c.ends_at >= now()
    AND ST_DWithin(g.center, v_viewer, g.radius_km * 1000)
  ORDER BY avg_rating DESC NULLS LAST, c.priority DESC
  LIMIT _limit;
END $$;

-- Expire sweep
CREATE OR REPLACE FUNCTION public.expire_campaigns()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE ad_campaigns SET status = 'expired'
   WHERE status IN ('active','paused') AND ends_at < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- Cron: expire every 15 minutes
SELECT cron.unschedule('expire-ad-campaigns') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-ad-campaigns'
);
SELECT cron.schedule(
  'expire-ad-campaigns',
  '*/15 * * * *',
  $cron$ SELECT public.expire_campaigns(); $cron$
);
