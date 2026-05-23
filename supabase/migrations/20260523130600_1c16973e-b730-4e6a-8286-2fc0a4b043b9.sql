
-- 1. New gated table
CREATE TABLE IF NOT EXISTS public.profile_contact_methods (
  user_id uuid PRIMARY KEY,
  methods jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_contact_methods ENABLE ROW LEVEL SECURITY;

-- 2. Access function (includes blood_show_contact in addition to can_view_phone)
CREATE OR REPLACE FUNCTION public.can_view_contact_methods(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_view_phone(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = _user_id AND p.blood_show_contact = true
    );
$$;

-- 3. RLS policies
CREATE POLICY "Visible contact methods"
ON public.profile_contact_methods
FOR SELECT
TO anon, authenticated
USING (public.can_view_contact_methods(user_id));

CREATE POLICY "Owner inserts own contact methods"
ON public.profile_contact_methods
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner updates own contact methods"
ON public.profile_contact_methods
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner deletes own contact methods"
ON public.profile_contact_methods
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin manages contact methods"
ON public.profile_contact_methods
FOR ALL
TO authenticated
USING (has_role('admin'::app_role, auth.uid()))
WITH CHECK (has_role('admin'::app_role, auth.uid()));

-- 4. Validation trigger on new table (port of validate_contact_methods)
CREATE OR REPLACE FUNCTION public.validate_profile_contact_methods()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  item jsonb;
BEGIN
  IF NEW.methods IS NULL THEN
    NEW.methods := '[]'::jsonb;
  END IF;
  IF jsonb_typeof(NEW.methods) <> 'array' THEN
    RAISE EXCEPTION 'methods must be a JSON array';
  END IF;
  IF jsonb_array_length(NEW.methods) > 10 THEN
    RAISE EXCEPTION 'methods cannot have more than 10 entries';
  END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.methods) LOOP
    IF jsonb_typeof(item) <> 'object' THEN
      RAISE EXCEPTION 'each method must be an object';
    END IF;
  END LOOP;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_profile_contact_methods_trg ON public.profile_contact_methods;
CREATE TRIGGER validate_profile_contact_methods_trg
BEFORE INSERT OR UPDATE ON public.profile_contact_methods
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_contact_methods();

-- 5. Backfill from profiles.contact_methods
INSERT INTO public.profile_contact_methods (user_id, methods)
SELECT user_id, contact_methods
FROM public.profiles
WHERE contact_methods IS NOT NULL AND contact_methods <> '[]'::jsonb
ON CONFLICT (user_id) DO NOTHING;

-- 6. Drop old column + its validation trigger
DROP TRIGGER IF EXISTS validate_contact_methods_trg ON public.profiles;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS contact_methods;
DROP FUNCTION IF EXISTS public.validate_contact_methods();
