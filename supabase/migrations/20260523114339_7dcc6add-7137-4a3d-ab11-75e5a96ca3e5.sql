
-- =====================================================================
-- 1. Move workers.cnic into private table
-- =====================================================================
CREATE TABLE public.worker_private (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cnic text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner views own private"
  ON public.worker_private FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin views all private"
  ON public.worker_private FOR SELECT TO authenticated
  USING (has_role('admin'::app_role, auth.uid()));

CREATE POLICY "Owner inserts own private"
  ON public.worker_private FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner updates own private"
  ON public.worker_private FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin manages private"
  ON public.worker_private FOR ALL TO authenticated
  USING (has_role('admin'::app_role, auth.uid()))
  WITH CHECK (has_role('admin'::app_role, auth.uid()));

INSERT INTO public.worker_private (user_id, cnic)
SELECT user_id, cnic FROM public.workers WHERE cnic IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.workers DROP COLUMN cnic;

CREATE TRIGGER trg_worker_private_updated_at
  BEFORE UPDATE ON public.worker_private
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 2. Move profiles.phone into a private table with visibility rules
-- =====================================================================
CREATE TABLE public.profile_phones (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_phones ENABLE ROW LEVEL SECURITY;

-- Function: can the current viewer see this user's phone?
CREATE OR REPLACE FUNCTION public.can_view_phone(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    -- own phone
    (auth.uid() IS NOT NULL AND auth.uid() = _user_id)
    -- admins
    OR public.has_role('admin'::app_role, auth.uid())
    -- owner has chosen to show contact publicly
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = _user_id AND p.show_contact = true
    )
    -- signed-in user who has an approved contact reveal for this worker
    OR (
      auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.contact_reveals cr
        WHERE cr.worker_user_id = _user_id
          AND cr.client_user_id = auth.uid()
          AND cr.status = 'approved'
      )
    );
$$;

CREATE POLICY "Visible phone"
  ON public.profile_phones FOR SELECT TO anon, authenticated
  USING (public.can_view_phone(user_id));

CREATE POLICY "Owner inserts own phone"
  ON public.profile_phones FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner updates own phone"
  ON public.profile_phones FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner deletes own phone"
  ON public.profile_phones FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin manages phones"
  ON public.profile_phones FOR ALL TO authenticated
  USING (has_role('admin'::app_role, auth.uid()))
  WITH CHECK (has_role('admin'::app_role, auth.uid()));

INSERT INTO public.profile_phones (user_id, phone)
SELECT user_id, phone FROM public.profiles WHERE phone IS NOT NULL AND phone <> ''
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN phone;

CREATE TRIGGER trg_profile_phones_updated_at
  BEFORE UPDATE ON public.profile_phones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 3. Tighten ad_geo_targets — only visible for currently active campaigns
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can view geo targets of visible campaigns" ON public.ad_geo_targets;

CREATE POLICY "Public views geo targets of active campaigns"
  ON public.ad_geo_targets FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ad_campaigns c
    WHERE c.id = ad_geo_targets.campaign_id
      AND c.status = 'active'
      AND c.starts_at <= now()
      AND c.ends_at >= now()
  ));

-- =====================================================================
-- 4. Payment settings — require sign-in
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can read payment settings" ON public.payment_settings;
CREATE POLICY "Authenticated can read payment settings"
  ON public.payment_settings FOR SELECT TO authenticated
  USING (true);

-- =====================================================================
-- 5. Avatars bucket — require path ownership for upload/update/delete
-- =====================================================================
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

CREATE POLICY "Users can upload own avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
