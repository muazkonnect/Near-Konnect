
-- ============ ENUM extension ============
ALTER TYPE public.sparks_reason ADD VALUE IF NOT EXISTS 'purchase';
ALTER TYPE public.sparks_reason ADD VALUE IF NOT EXISTS 'admin_added';
ALTER TYPE public.sparks_reason ADD VALUE IF NOT EXISTS 'ad_spent';
ALTER TYPE public.sparks_reason ADD VALUE IF NOT EXISTS 'bonus';
ALTER TYPE public.sparks_reason ADD VALUE IF NOT EXISTS 'deduction';

-- ============ sparks_wallets: re-key on owner_user_id ============
ALTER TABLE public.sparks_wallets DROP CONSTRAINT IF EXISTS sparks_wallets_pkey;
ALTER TABLE public.sparks_wallets ALTER COLUMN worker_id DROP NOT NULL;
ALTER TABLE public.sparks_wallets ADD CONSTRAINT sparks_wallets_pkey PRIMARY KEY (owner_user_id);
ALTER TABLE public.sparks_wallets
  ADD COLUMN IF NOT EXISTS total_purchased integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ============ sparks_transactions ============
ALTER TABLE public.sparks_transactions ALTER COLUMN worker_id DROP NOT NULL;
ALTER TABLE public.sparks_transactions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_request_id uuid;
CREATE INDEX IF NOT EXISTS sparks_tx_owner_idx ON public.sparks_transactions(owner_user_id, created_at DESC);

-- ============ sparks_packages ============
CREATE TABLE IF NOT EXISTS public.sparks_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sparks integer NOT NULL CHECK (sparks > 0),
  bonus_sparks integer NOT NULL DEFAULT 0,
  price_pkr numeric(12,2) NOT NULL DEFAULT 0,
  price_usdt numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sparks_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active packages" ON public.sparks_packages;
CREATE POLICY "Anyone can view active packages" ON public.sparks_packages
  FOR SELECT USING (is_active = true OR public.has_role('admin'::app_role, auth.uid()));
DROP POLICY IF EXISTS "Admins manage packages" ON public.sparks_packages;
CREATE POLICY "Admins manage packages" ON public.sparks_packages
  FOR ALL USING (public.has_role('admin'::app_role, auth.uid()))
  WITH CHECK (public.has_role('admin'::app_role, auth.uid()));

-- ============ payment_settings (single row) ============
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id integer PRIMARY KEY DEFAULT 1,
  easypaisa_number text DEFAULT '',
  easypaisa_account_name text DEFAULT '',
  easypaisa_qr_url text DEFAULT '',
  jazzcash_number text DEFAULT '',
  jazzcash_account_name text DEFAULT '',
  jazzcash_qr_url text DEFAULT '',
  usdt_address text DEFAULT '',
  usdt_network text DEFAULT 'TRC20',
  usdt_qr_url text DEFAULT '',
  instructions text DEFAULT '',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_settings_single CHECK (id = 1)
);
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read payment settings" ON public.payment_settings;
CREATE POLICY "Anyone can read payment settings" ON public.payment_settings
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage payment settings" ON public.payment_settings;
CREATE POLICY "Admins manage payment settings" ON public.payment_settings
  FOR ALL USING (public.has_role('admin'::app_role, auth.uid()))
  WITH CHECK (public.has_role('admin'::app_role, auth.uid()));
INSERT INTO public.payment_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============ payment_requests ============
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid REFERENCES public.sparks_packages(id) ON DELETE SET NULL,
  sparks_amount integer NOT NULL CHECK (sparks_amount > 0),
  bonus_sparks integer NOT NULL DEFAULT 0,
  price_amount numeric(12,2) NOT NULL,
  currency text NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('easypaisa','jazzcash','usdt')),
  reference text NOT NULL DEFAULT '',
  proof_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  admin_note text NOT NULL DEFAULT '',
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_requests_user_idx ON public.payment_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_requests_status_idx ON public.payment_requests(status, created_at DESC);
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own payment requests" ON public.payment_requests;
CREATE POLICY "Users view own payment requests" ON public.payment_requests
  FOR SELECT USING (auth.uid() = user_id OR public.has_role('admin'::app_role, auth.uid()));
DROP POLICY IF EXISTS "Users create own payment requests" ON public.payment_requests;
CREATE POLICY "Users create own payment requests" ON public.payment_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
DROP POLICY IF EXISTS "Users cancel own pending" ON public.payment_requests;
CREATE POLICY "Users cancel own pending" ON public.payment_requests
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending','cancelled'));
DROP POLICY IF EXISTS "Admins manage payment requests" ON public.payment_requests;
CREATE POLICY "Admins manage payment requests" ON public.payment_requests
  FOR ALL USING (public.has_role('admin'::app_role, auth.uid()))
  WITH CHECK (public.has_role('admin'::app_role, auth.uid()));

-- ============ Trigger: auto-create wallet on signup ============
CREATE OR REPLACE FUNCTION public.ensure_sparks_wallet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.sparks_wallets (owner_user_id, balance) VALUES (NEW.id, 0)
  ON CONFLICT (owner_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.ensure_sparks_wallet();

INSERT INTO public.sparks_wallets (owner_user_id, balance)
SELECT u.id, 0 FROM auth.users u
ON CONFLICT (owner_user_id) DO NOTHING;

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS touch_payment_requests ON public.payment_requests;
CREATE TRIGGER touch_payment_requests BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS touch_packages ON public.sparks_packages;
CREATE TRIGGER touch_packages BEFORE UPDATE ON public.sparks_packages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ Core wallet RPCs ============
CREATE OR REPLACE FUNCTION public.spend_sparks(
  p_amount integer, p_reason text DEFAULT 'ad_spent',
  p_notes text DEFAULT NULL, p_campaign_id uuid DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_bal integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  INSERT INTO public.sparks_wallets (owner_user_id, balance) VALUES (v_uid, 0)
  ON CONFLICT (owner_user_id) DO NOTHING;
  UPDATE public.sparks_wallets
    SET balance = balance - p_amount,
        total_spent = total_spent + p_amount,
        updated_at = now()
    WHERE owner_user_id = v_uid AND balance >= p_amount
    RETURNING balance INTO v_bal;
  IF v_bal IS NULL THEN RAISE EXCEPTION 'Insufficient Sparks'; END IF;
  INSERT INTO public.sparks_transactions (owner_user_id, delta, reason, notes, campaign_id, status)
  VALUES (v_uid, -p_amount, p_reason::sparks_reason, p_notes, p_campaign_id, 'completed');
  RETURN v_bal;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_credit_sparks(
  p_user uuid, p_amount integer, p_reason text DEFAULT 'admin_added', p_notes text DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bal integer;
BEGIN
  IF NOT public.has_role('admin'::app_role, auth.uid()) THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  INSERT INTO public.sparks_wallets (owner_user_id, balance) VALUES (p_user, 0)
  ON CONFLICT (owner_user_id) DO NOTHING;
  UPDATE public.sparks_wallets
    SET balance = balance + p_amount,
        total_purchased = CASE WHEN p_reason IN ('purchase','admin_added','bonus') THEN total_purchased + p_amount ELSE total_purchased END,
        updated_at = now()
    WHERE owner_user_id = p_user
    RETURNING balance INTO v_bal;
  INSERT INTO public.sparks_transactions (owner_user_id, delta, reason, notes, status)
  VALUES (p_user, p_amount, p_reason::sparks_reason, p_notes, 'completed');
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'sparks_credit', 'user', p_user::text, jsonb_build_object('amount', p_amount, 'reason', p_reason, 'notes', p_notes));
  RETURN v_bal;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_debit_sparks(
  p_user uuid, p_amount integer, p_reason text DEFAULT 'deduction', p_notes text DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bal integer;
BEGIN
  IF NOT public.has_role('admin'::app_role, auth.uid()) THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  UPDATE public.sparks_wallets
    SET balance = GREATEST(balance - p_amount, 0), updated_at = now()
    WHERE owner_user_id = p_user
    RETURNING balance INTO v_bal;
  INSERT INTO public.sparks_transactions (owner_user_id, delta, reason, notes, status)
  VALUES (p_user, -p_amount, p_reason::sparks_reason, p_notes, 'completed');
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'sparks_debit', 'user', p_user::text, jsonb_build_object('amount', p_amount, 'reason', p_reason, 'notes', p_notes));
  RETURN COALESCE(v_bal, 0);
END; $$;

CREATE OR REPLACE FUNCTION public.approve_payment_request(p_id uuid, p_note text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_total integer;
BEGIN
  IF NOT public.has_role('admin'::app_role, auth.uid()) THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO r FROM public.payment_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'Already %', r.status; END IF;
  v_total := r.sparks_amount + COALESCE(r.bonus_sparks, 0);
  INSERT INTO public.sparks_wallets (owner_user_id, balance) VALUES (r.user_id, 0)
  ON CONFLICT (owner_user_id) DO NOTHING;
  UPDATE public.sparks_wallets
    SET balance = balance + v_total,
        total_purchased = total_purchased + v_total,
        updated_at = now()
    WHERE owner_user_id = r.user_id;
  INSERT INTO public.sparks_transactions
    (owner_user_id, delta, reason, notes, status, payment_method, payment_request_id)
  VALUES (r.user_id, v_total, 'purchase'::sparks_reason,
     COALESCE(NULLIF(p_note,''), 'Payment approved (' || r.payment_method || ')'),
     'completed', r.payment_method, r.id);
  UPDATE public.payment_requests
    SET status = 'approved', admin_note = COALESCE(p_note,''), decided_by = auth.uid(), decided_at = now()
    WHERE id = p_id;
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'payment_approve', 'payment_request', p_id::text,
          jsonb_build_object('sparks', v_total, 'method', r.payment_method));
  RETURN p_id;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_payment_request(p_id uuid, p_note text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role('admin'::app_role, auth.uid()) THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.payment_requests
    SET status = 'rejected', admin_note = COALESCE(p_note,''), decided_by = auth.uid(), decided_at = now()
    WHERE id = p_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Already decided or not found'; END IF;
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'payment_reject', 'payment_request', p_id::text, jsonb_build_object('note', p_note));
  RETURN p_id;
END; $$;

-- ============ Seed packages ============
INSERT INTO public.sparks_packages (name, sparks, bonus_sparks, price_pkr, price_usdt, sort_order)
SELECT * FROM (VALUES
  ('Starter',  100,   0,   500,   2,  1),
  ('Boost',    500,  50,  2400,   9,  2),
  ('Pro',     1000, 150,  4500,  17,  3),
  ('Elite',   2500, 500, 10000,  40,  4)
) AS v(name, sparks, bonus_sparks, price_pkr, price_usdt, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.sparks_packages);

-- ============ Storage: payment-proofs ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own proof" ON storage.objects;
CREATE POLICY "Users upload own proof" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
DROP POLICY IF EXISTS "Users read own proof" ON storage.objects;
CREATE POLICY "Users read own proof" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR public.has_role('admin'::app_role, auth.uid()))
  );
DROP POLICY IF EXISTS "Admins delete proof" ON storage.objects;
CREATE POLICY "Admins delete proof" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'payment-proofs' AND public.has_role('admin'::app_role, auth.uid())
  );
