-- 1) Create admin_audit_log table to track admin actions in real time
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON public.admin_audit_log (admin_user_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
ON public.admin_audit_log FOR SELECT TO authenticated
USING (public.has_role('admin'::public.app_role, auth.uid()));

CREATE POLICY "Admins can insert audit log entries"
ON public.admin_audit_log FOR INSERT TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role, auth.uid()) AND admin_user_id = auth.uid());

-- 2) Update handle_new_user so an admin signup never creates a worker row.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_experience integer;
  v_service_area text;
  v_is_blood_donor boolean;
  v_main_category text;
  v_sub_category text;
  v_profession text;
  v_lat double precision;
  v_lng double precision;
BEGIN
  v_role := CASE WHEN NEW.raw_user_meta_data->>'role' IN ('customer','worker','admin')
    THEN (NEW.raw_user_meta_data->>'role')::public.app_role ELSE 'customer'::public.app_role END;
  v_experience := CASE WHEN COALESCE(NEW.raw_user_meta_data->>'experience','') ~ '^[0-9]+$'
    THEN (NEW.raw_user_meta_data->>'experience')::integer ELSE 0 END;
  v_service_area := COALESCE(NULLIF(NEW.raw_user_meta_data->>'service_area',''), NULLIF(NEW.raw_user_meta_data->>'service_areas',''));
  v_is_blood_donor := COALESCE((NEW.raw_user_meta_data->>'is_blood_donor')::boolean, false);
  v_main_category := NULLIF(NEW.raw_user_meta_data->>'main_category','');
  v_sub_category  := NULLIF(NEW.raw_user_meta_data->>'sub_category','');
  v_profession    := COALESCE(NULLIF(NEW.raw_user_meta_data->>'profession',''), v_sub_category);
  v_lat := NULLIF(NEW.raw_user_meta_data->>'latitude','')::double precision;
  v_lng := NULLIF(NEW.raw_user_meta_data->>'longitude','')::double precision;

  INSERT INTO public.profiles (user_id, full_name, phone, city, avatar_url, blood_group, is_blood_donor, donor_status)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(COALESCE(NEW.email,''),'@',1), 'User'),
    NULLIF(NEW.raw_user_meta_data->>'phone',''),
    NULLIF(NEW.raw_user_meta_data->>'city',''),
    NULLIF(NEW.raw_user_meta_data->>'avatar_url',''),
    NULLIF(NEW.raw_user_meta_data->>'blood_group',''),
    v_is_blood_donor,
    CASE WHEN v_is_blood_donor THEN 'active' ELSE 'inactive' END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    city = COALESCE(EXCLUDED.city, public.profiles.city),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    blood_group = COALESCE(EXCLUDED.blood_group, public.profiles.blood_group),
    is_blood_donor = EXCLUDED.is_blood_donor,
    donor_status = EXCLUDED.donor_status,
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Only create worker row when role is 'worker' AND user picked real category info.
  -- Admins are NEVER treated as workers.
  IF v_role = 'worker' AND v_profession IS NOT NULL AND v_main_category IS NOT NULL AND v_sub_category IS NOT NULL THEN
    INSERT INTO public.workers (user_id, profession, main_category, sub_category, experience, cnic, city, service_areas, latitude, longitude, available)
    VALUES (
      NEW.id,
      v_profession,
      v_main_category,
      v_sub_category,
      v_experience,
      NULLIF(NEW.raw_user_meta_data->>'cnic',''),
      NULLIF(NEW.raw_user_meta_data->>'city',''),
      CASE WHEN v_service_area IS NOT NULL
        THEN regexp_split_to_array(regexp_replace(v_service_area, '\s*,\s*', ',', 'g'), ',')
        ELSE '{}'::text[] END,
      v_lat,
      v_lng,
      true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      profession    = EXCLUDED.profession,
      main_category = EXCLUDED.main_category,
      sub_category  = EXCLUDED.sub_category,
      experience    = EXCLUDED.experience,
      cnic          = COALESCE(EXCLUDED.cnic, public.workers.cnic),
      city          = COALESCE(EXCLUDED.city, public.workers.city),
      latitude      = COALESCE(EXCLUDED.latitude, public.workers.latitude),
      longitude     = COALESCE(EXCLUDED.longitude, public.workers.longitude),
      service_areas = CASE WHEN array_length(EXCLUDED.service_areas, 1) IS NOT NULL THEN EXCLUDED.service_areas ELSE public.workers.service_areas END,
      updated_at    = now();
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Remove any pre-existing worker rows for users that hold the admin role.
DELETE FROM public.workers w
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = w.user_id AND ur.role = 'admin'::public.app_role
);

-- 4) Realtime: include admin_audit_log and featured_requests in publication for live UI updates.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_log;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.featured_requests;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;