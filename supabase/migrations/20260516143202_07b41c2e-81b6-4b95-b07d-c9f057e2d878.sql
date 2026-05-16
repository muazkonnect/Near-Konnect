
CREATE OR REPLACE FUNCTION public.prevent_avatar_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.avatar_url IS NOT NULL
     AND OLD.avatar_url <> ''
     AND NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    RAISE EXCEPTION 'Profile photo is permanent and cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_profile_avatar ON public.profiles;
CREATE TRIGGER lock_profile_avatar
BEFORE UPDATE OF avatar_url ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_avatar_change();
