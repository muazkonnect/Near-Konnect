
CREATE OR REPLACE FUNCTION public.lock_worker_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role('admin'::app_role, auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF OLD.latitude IS DISTINCT FROM NEW.latitude
     OR OLD.longitude IS DISTINCT FROM NEW.longitude
     OR OLD.city IS DISTINCT FROM NEW.city
     OR OLD.workplace_location IS DISTINCT FROM NEW.workplace_location THEN
    RAISE EXCEPTION 'Service location is permanent. Please contact an admin to change it.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_worker_location ON public.workers;
CREATE TRIGGER trg_lock_worker_location
BEFORE UPDATE ON public.workers
FOR EACH ROW
EXECUTE FUNCTION public.lock_worker_location();
