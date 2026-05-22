CREATE OR REPLACE FUNCTION public.sync_featured_default_radius()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_radius int;
BEGIN
  IF NEW.key = 'featured_default_radius_km' THEN
    BEGIN
      v_radius := (NEW.value)::int;
    EXCEPTION WHEN others THEN
      v_radius := NULL;
    END;
    IF v_radius IS NOT NULL AND v_radius > 0 THEN
      UPDATE public.featured_workers
        SET radius_km = v_radius, updated_at = now()
        WHERE status = 'active' AND ends_at > now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_featured_default_radius ON public.app_settings;
CREATE TRIGGER trg_sync_featured_default_radius
AFTER INSERT OR UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.sync_featured_default_radius();