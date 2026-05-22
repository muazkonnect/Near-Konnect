
-- Worker inactivity tracking
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS auto_disabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_workers_last_active_at ON public.workers(last_active_at);

-- RPC: mark active and auto-enable if previously auto-disabled
CREATE OR REPLACE FUNCTION public.worker_mark_active()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.workers
  SET last_active_at = now(),
      available = CASE WHEN auto_disabled THEN true ELSE available END,
      auto_disabled = false,
      updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.worker_mark_active() TO authenticated;

-- Auto-disable function (cron-callable)
CREATE OR REPLACE FUNCTION public.auto_disable_inactive_workers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.workers
  SET available = false,
      auto_disabled = true,
      updated_at = now()
  WHERE available = true
    AND auto_disabled = false
    AND last_active_at < now() - interval '7 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Self-delete function for any logged-in user (cascades via FKs)
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  -- Block staff/admin self-delete via this path
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role IN ('admin','manager','ads_manager','moderator')
  ) THEN
    RAISE EXCEPTION 'Staff accounts cannot self-delete; contact another admin.';
  END IF;
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- Multi-network USDT addresses on payment_settings
ALTER TABLE public.payment_settings
  ADD COLUMN IF NOT EXISTS usdt_address_trc text DEFAULT '',
  ADD COLUMN IF NOT EXISTS usdt_address_bep text DEFAULT '',
  ADD COLUMN IF NOT EXISTS usdt_address_erc text DEFAULT '',
  ADD COLUMN IF NOT EXISTS usdt_qr_trc_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS usdt_qr_bep_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS usdt_qr_erc_url text DEFAULT '';

-- Backfill TRC from existing usdt_address if empty
UPDATE public.payment_settings
SET usdt_address_trc = COALESCE(NULLIF(usdt_address_trc,''), COALESCE(usdt_address,'')),
    usdt_qr_trc_url = COALESCE(NULLIF(usdt_qr_trc_url,''), COALESCE(usdt_qr_url,''))
WHERE id = 1;
