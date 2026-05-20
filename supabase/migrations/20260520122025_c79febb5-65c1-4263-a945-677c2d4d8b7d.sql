
-- Rewrite ads spending and admin grant to use owner_user_id wallet model.

CREATE OR REPLACE FUNCTION public.create_ad_campaign(
  _worker_id uuid, _ad_type ad_type, _duration_days integer, _radius_km integer,
  _center_lat double precision, _center_lng double precision,
  _country text DEFAULT NULL, _city text DEFAULT NULL, _area text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
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

  -- Ensure wallet exists and has enough
  INSERT INTO sparks_wallets(owner_user_id, balance) VALUES (v_owner, 0)
    ON CONFLICT (owner_user_id) DO NOTHING;

  UPDATE sparks_wallets
     SET balance = balance - v_cost,
         total_spent = total_spent + v_cost,
         updated_at = now()
   WHERE owner_user_id = v_owner AND balance >= v_cost
   RETURNING balance INTO v_bal;
  IF v_bal IS NULL THEN RAISE EXCEPTION 'INSUFFICIENT_SPARKS'; END IF;

  INSERT INTO ad_campaigns(worker_id, owner_user_id, ad_type, status, duration_days, starts_at, ends_at, sparks_cost)
  VALUES (_worker_id, v_owner, _ad_type, 'active', _duration_days, now(), v_ends, v_cost)
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
END $$;

-- Admin grant by worker (legacy) -> route to owner wallet
CREATE OR REPLACE FUNCTION public.grant_sparks(_worker_id uuid, _amount integer, _notes text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _owner uuid; _new_bal integer;
BEGIN
  IF NOT has_role('admin'::app_role, auth.uid()) THEN RAISE EXCEPTION 'NOT_ADMIN'; END IF;
  IF _amount = 0 THEN RAISE EXCEPTION 'ZERO_AMOUNT'; END IF;
  SELECT user_id INTO _owner FROM workers WHERE id = _worker_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'WORKER_NOT_FOUND'; END IF;

  INSERT INTO sparks_wallets (owner_user_id, balance) VALUES (_owner, GREATEST(_amount, 0))
  ON CONFLICT (owner_user_id) DO UPDATE
    SET balance = GREATEST(sparks_wallets.balance + _amount, 0),
        total_purchased = sparks_wallets.total_purchased + GREATEST(_amount, 0),
        updated_at = now()
  RETURNING balance INTO _new_bal;

  INSERT INTO sparks_transactions (owner_user_id, worker_id, delta, reason, notes, status)
  VALUES (_owner, _worker_id, _amount,
          CASE WHEN _amount > 0 THEN 'admin_added'::sparks_reason ELSE 'deduction'::sparks_reason END,
          _notes, 'completed');
  RETURN _new_bal;
END $$;
