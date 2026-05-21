-- ============ Sparks reasons ============
ALTER TYPE public.sparks_reason ADD VALUE IF NOT EXISTS 'verification';
ALTER TYPE public.sparks_reason ADD VALUE IF NOT EXISTS 'featured';

-- ============ Verification settings (singleton) ============
CREATE TABLE IF NOT EXISTS public.verification_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  sparks_cost integer NOT NULL DEFAULT 500,
  persona_template_id text DEFAULT '',
  persona_environment_id text DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  auto_approve_on_persona_pass boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.verification_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.verification_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads verification settings" ON public.verification_settings;
CREATE POLICY "Anyone reads verification settings" ON public.verification_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage verification settings" ON public.verification_settings;
CREATE POLICY "Admins manage verification settings" ON public.verification_settings FOR ALL
  USING (public.has_role('admin'::app_role, auth.uid()))
  WITH CHECK (public.has_role('admin'::app_role, auth.uid()));

-- ============ Worker verifications ============
CREATE TABLE IF NOT EXISTS public.worker_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'none' CHECK (status IN ('none','submitted','approved','rejected','resubmit')),
  persona_inquiry_id text,
  persona_session_token text,
  persona_status text,
  persona_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sparks_cost integer NOT NULL DEFAULT 0,
  submitted_at timestamptz,
  decided_at timestamptz,
  decided_by uuid,
  admin_note text NOT NULL DEFAULT '',
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wv_status ON public.worker_verifications(status);
CREATE INDEX IF NOT EXISTS idx_wv_user ON public.worker_verifications(user_id);

ALTER TABLE public.worker_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own verification" ON public.worker_verifications;
CREATE POLICY "Users view own verification" ON public.worker_verifications FOR SELECT
  USING (auth.uid() = user_id OR public.has_role('admin'::app_role, auth.uid()));
DROP POLICY IF EXISTS "Admins manage verifications" ON public.worker_verifications;
CREATE POLICY "Admins manage verifications" ON public.worker_verifications FOR ALL
  USING (public.has_role('admin'::app_role, auth.uid()))
  WITH CHECK (public.has_role('admin'::app_role, auth.uid()));

DROP TRIGGER IF EXISTS touch_worker_verifications ON public.worker_verifications;
CREATE TRIGGER touch_worker_verifications BEFORE UPDATE ON public.worker_verifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ Verification documents ============
CREATE TABLE IF NOT EXISTS public.verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid NOT NULL REFERENCES public.worker_verifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('id_front','id_back','selfie','other')),
  storage_path text NOT NULL,
  persona_file_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vd_verification ON public.verification_documents(verification_id);
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners and admins read docs" ON public.verification_documents;
CREATE POLICY "Owners and admins read docs" ON public.verification_documents FOR SELECT
  USING (auth.uid() = user_id OR public.has_role('admin'::app_role, auth.uid()));
DROP POLICY IF EXISTS "Owners insert docs" ON public.verification_documents;
CREATE POLICY "Owners insert docs" ON public.verification_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins delete docs" ON public.verification_documents;
CREATE POLICY "Admins delete docs" ON public.verification_documents FOR DELETE
  USING (public.has_role('admin'::app_role, auth.uid()));

-- ============ Storage bucket: verification-docs (private) ============
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-docs', 'verification-docs', false)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ver_docs owner upload" ON storage.objects;
CREATE POLICY "ver_docs owner upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "ver_docs owner read" ON storage.objects;
CREATE POLICY "ver_docs owner read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'verification-docs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role('admin'::app_role, auth.uid())));
DROP POLICY IF EXISTS "ver_docs admin delete" ON storage.objects;
CREATE POLICY "ver_docs admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'verification-docs' AND public.has_role('admin'::app_role, auth.uid()));

-- ============ Featured workers ============
CREATE TABLE IF NOT EXISTS public.featured_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  user_id uuid NOT NULL,
  category_id uuid,
  duration_days integer NOT NULL CHECK (duration_days IN (1,7,15,30)),
  sparks_cost integer NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','refunded')),
  center geography(Point, 4326) NOT NULL,
  radius_km integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fw_active ON public.featured_workers(status, ends_at);
CREATE INDEX IF NOT EXISTS idx_fw_center ON public.featured_workers USING GIST(center);
CREATE INDEX IF NOT EXISTS idx_fw_worker ON public.featured_workers(worker_id);

ALTER TABLE public.featured_workers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public reads active featured" ON public.featured_workers;
CREATE POLICY "Public reads active featured" ON public.featured_workers FOR SELECT
  USING (status = 'active' AND starts_at <= now() AND ends_at >= now());
DROP POLICY IF EXISTS "Owners read own featured" ON public.featured_workers;
CREATE POLICY "Owners read own featured" ON public.featured_workers FOR SELECT
  USING (auth.uid() = user_id OR public.has_role('admin'::app_role, auth.uid()));
DROP POLICY IF EXISTS "Admins manage featured" ON public.featured_workers;
CREATE POLICY "Admins manage featured" ON public.featured_workers FOR ALL
  USING (public.has_role('admin'::app_role, auth.uid()))
  WITH CHECK (public.has_role('admin'::app_role, auth.uid()));

DROP TRIGGER IF EXISTS touch_featured_workers ON public.featured_workers;
CREATE TRIGGER touch_featured_workers BEFORE UPDATE ON public.featured_workers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ Featured pricing rules ============
CREATE TABLE IF NOT EXISTS public.featured_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duration_days integer NOT NULL CHECK (duration_days IN (1,7,15,30)),
  category_id uuid,
  base_sparks integer NOT NULL,
  multiplier numeric NOT NULL DEFAULT 1.0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fpr ON public.featured_pricing_rules(duration_days, COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid));
ALTER TABLE public.featured_pricing_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads active pricing" ON public.featured_pricing_rules;
CREATE POLICY "Anyone reads active pricing" ON public.featured_pricing_rules FOR SELECT
  USING (active OR public.has_role('admin'::app_role, auth.uid()));
DROP POLICY IF EXISTS "Admins manage pricing" ON public.featured_pricing_rules;
CREATE POLICY "Admins manage pricing" ON public.featured_pricing_rules FOR ALL
  USING (public.has_role('admin'::app_role, auth.uid()))
  WITH CHECK (public.has_role('admin'::app_role, auth.uid()));

DROP TRIGGER IF EXISTS touch_featured_pricing ON public.featured_pricing_rules;
CREATE TRIGGER touch_featured_pricing BEFORE UPDATE ON public.featured_pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed pricing (idempotent)
INSERT INTO public.featured_pricing_rules (duration_days, base_sparks, multiplier, active)
VALUES (1, 100, 1.0, true), (7, 600, 1.0, true), (15, 1200, 1.0, true), (30, 2200, 1.0, true)
ON CONFLICT DO NOTHING;

-- ============ RPCs ============
CREATE OR REPLACE FUNCTION public.start_verification()
RETURNS public.worker_verifications LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_worker workers%ROWTYPE; v_row worker_verifications%ROWTYPE; v_cost int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_worker FROM public.workers WHERE user_id = v_uid LIMIT 1;
  IF v_worker.id IS NULL THEN RAISE EXCEPTION 'Worker profile required'; END IF;
  SELECT sparks_cost INTO v_cost FROM public.verification_settings WHERE id = 1;
  INSERT INTO public.worker_verifications (worker_id, user_id, sparks_cost, status)
    VALUES (v_worker.id, v_uid, COALESCE(v_cost, 500), 'none')
  ON CONFLICT (worker_id) DO UPDATE SET sparks_cost = EXCLUDED.sparks_cost, updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.submit_verification(
  p_inquiry_id text, p_session_token text DEFAULT NULL
) RETURNS public.worker_verifications LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row worker_verifications%ROWTYPE; v_cost int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_row FROM public.worker_verifications WHERE user_id = v_uid;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Start verification first'; END IF;
  IF v_row.status = 'approved' THEN RAISE EXCEPTION 'Already verified'; END IF;
  IF v_row.submitted_at IS NULL THEN
    v_cost := v_row.sparks_cost;
    IF v_cost > 0 THEN PERFORM public.spend_sparks(v_cost, 'verification', 'Worker verification', NULL); END IF;
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

CREATE OR REPLACE FUNCTION public.admin_decide_verification(
  p_id uuid, p_status text, p_note text DEFAULT ''
) RETURNS public.worker_verifications LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row worker_verifications%ROWTYPE;
BEGIN
  IF NOT public.has_role('admin'::app_role, auth.uid()) THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_status NOT IN ('approved','rejected','resubmit') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.worker_verifications
    SET status = p_status, admin_note = COALESCE(p_note,''), decided_at = now(), decided_by = auth.uid(),
        verified_at = CASE WHEN p_status='approved' THEN now() ELSE verified_at END,
        updated_at = now()
    WHERE id = p_id
    RETURNING * INTO v_row;
  IF p_status = 'approved' THEN
    UPDATE public.workers SET verified = true WHERE id = v_row.worker_id;
  END IF;
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'verification.'||p_status, 'worker', v_row.worker_id::text, jsonb_build_object('note', p_note));
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_revoke_verification(
  p_worker_id uuid, p_note text DEFAULT ''
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role('admin'::app_role, auth.uid()) THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.workers SET verified = false WHERE id = p_worker_id;
  UPDATE public.worker_verifications SET status = 'rejected', admin_note = COALESCE(p_note,''),
    decided_at = now(), decided_by = auth.uid(), verified_at = NULL, updated_at = now()
    WHERE worker_id = p_worker_id;
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'verification.revoked', 'worker', p_worker_id::text, jsonb_build_object('note', p_note));
END; $$;

CREATE OR REPLACE FUNCTION public.purchase_featured(
  p_duration_days integer, p_category_id uuid DEFAULT NULL
) RETURNS public.featured_workers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_worker workers%ROWTYPE;
  v_prof profiles%ROWTYPE;
  v_cost integer;
  v_rule featured_pricing_rules%ROWTYPE;
  v_row featured_workers%ROWTYPE;
  v_lat double precision; v_lng double precision;
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

  PERFORM public.spend_sparks(v_cost, 'featured', 'Featured worker '||p_duration_days||'d', NULL);

  INSERT INTO public.featured_workers (worker_id, user_id, category_id, duration_days, sparks_cost,
                                       ends_at, status, center, radius_km)
    VALUES (v_worker.id, v_uid, p_category_id, p_duration_days, v_cost,
            now() + (p_duration_days::text || ' days')::interval, 'active',
            ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326)::geography, 3)
    RETURNING * INTO v_row;
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.expire_featured_workers()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  WITH upd AS (
    UPDATE public.featured_workers SET status = 'expired', updated_at = now()
      WHERE status = 'active' AND ends_at < now() RETURNING 1
  ) SELECT count(*) INTO v_count FROM upd;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.nearby_featured_workers(
  p_lat double precision, p_lng double precision, p_category_id uuid DEFAULT NULL, p_limit int DEFAULT 30
) RETURNS TABLE (
  id uuid, worker_id uuid, user_id uuid, category_id uuid, ends_at timestamptz,
  distance_km double precision, category_match boolean
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT fw.id, fw.worker_id, fw.user_id, fw.category_id, fw.ends_at,
    ST_Distance(fw.center, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) / 1000.0,
    (p_category_id IS NOT NULL AND fw.category_id = p_category_id)
  FROM public.featured_workers fw
  WHERE fw.status = 'active' AND fw.starts_at <= now() AND fw.ends_at >= now()
    AND ST_DWithin(fw.center, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, fw.radius_km * 1000)
  ORDER BY (p_category_id IS NOT NULL AND fw.category_id = p_category_id) DESC,
    ST_Distance(fw.center, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.start_verification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_verification(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_decide_verification(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_verification(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_featured(integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_featured_workers(double precision, double precision, uuid, int) TO anon, authenticated;

-- ============ Cron: expire featured every 5 min ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-featured-workers') THEN
    PERFORM cron.schedule('expire-featured-workers', '*/5 * * * *', $cron$ SELECT public.expire_featured_workers(); $cron$);
  END IF;
END $$;