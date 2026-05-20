CREATE OR REPLACE FUNCTION public.grant_sparks(
  _worker_id uuid,
  _amount integer,
  _notes text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _new_bal integer;
BEGIN
  IF NOT has_role('admin'::app_role, auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  IF _amount = 0 THEN RAISE EXCEPTION 'ZERO_AMOUNT'; END IF;

  SELECT user_id INTO _owner FROM workers WHERE id = _worker_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'WORKER_NOT_FOUND'; END IF;

  INSERT INTO sparks_wallets (worker_id, owner_user_id, balance, updated_at)
  VALUES (_worker_id, _owner, GREATEST(_amount, 0), now())
  ON CONFLICT (worker_id) DO UPDATE
    SET balance = GREATEST(sparks_wallets.balance + _amount, 0),
        updated_at = now()
  RETURNING balance INTO _new_bal;

  INSERT INTO sparks_transactions (worker_id, owner_user_id, delta, reason, notes, campaign_id)
  VALUES (_worker_id, _owner, _amount,
          CASE WHEN _amount > 0 THEN 'admin_grant'::sparks_reason ELSE 'admin_adjust'::sparks_reason END,
          _notes, NULL);

  RETURN _new_bal;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_sparks(uuid, integer, text) TO authenticated;