
-- Update handle_new_user to require email verification and phone number before creating public records
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
  v_phone text;
BEGIN
  -- Requirement: "user should not be added to the database untill the verification is complete"
  -- Check if email is confirmed.
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  v_phone := NULLIF(NEW.raw_user_meta_data->>'phone','');
  
  -- Requirement: "must enter the phone number to proceed"
  -- Extra safety check: if phone is missing from metadata, don't create profile yet.
  IF v_phone IS NULL THEN
    RETURN NEW;
  END IF;

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

  -- Create or update profile
  INSERT INTO public.profiles (user_id, full_name, phone, city, avatar_url, blood_group, is_blood_donor, donor_status)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(COALESCE(NEW.email,''),'@',1), 'User'),
    v_phone,
    NULLIF(NEW.raw_user_meta_data->>'city',''),
    NULLIF(NEW.raw_user_meta_data->>'avatar_url',''),
    NULLIF(NEW.raw_user_meta_data->>'blood_group',''),
    v_is_blood_donor,
    CASE WHEN v_is_blood_donor THEN 'active' ELSE 'inactive' END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    city = COALESCE(EXCLUDED.city, public.profiles.city),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    blood_group = COALESCE(EXCLUDED.blood_group, public.profiles.blood_group),
    is_blood_donor = EXCLUDED.is_blood_donor,
    donor_status = EXCLUDED.donor_status,
    updated_at = now();

  -- Assign role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Handle worker record if applicable
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
      service_areas = CASE WHEN array_length(EXCLUDED.service_areas, 1) IS NOT NULL THEN EXCLUDED.service_areas ELSE public.workers.service_areas END,
      latitude      = EXCLUDED.latitude,
      longitude     = EXCLUDED.longitude,
      updated_at    = now();
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure the trigger also runs on UPDATE of auth.users
-- This handles the case where email_confirmed_at changes from NULL to a timestamp
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enforce phone requirement at database level
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema='public' AND table_name='profiles' AND constraint_name='profiles_phone_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_check CHECK (phone IS NOT NULL AND phone <> '');
  END IF;
END $$;
