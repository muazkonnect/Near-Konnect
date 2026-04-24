-- 1. Remove existing worker rows for any current staff user
DELETE FROM public.workers w
USING public.user_roles ur
WHERE ur.user_id = w.user_id
  AND ur.role IN ('admin','manager','ads_manager','moderator');

-- 2. Trigger function: when staff role is assigned, drop their worker row
CREATE OR REPLACE FUNCTION public.cleanup_worker_on_staff_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IN ('admin','manager','ads_manager','moderator') THEN
    DELETE FROM public.workers WHERE user_id = NEW.user_id;
    -- Also drop any 'worker' role they may have had
    DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'worker';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_worker_on_staff_role ON public.user_roles;
CREATE TRIGGER trg_cleanup_worker_on_staff_role
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_worker_on_staff_role();

-- 3. Trigger function: prevent inserting a worker record for a staff user
CREATE OR REPLACE FUNCTION public.prevent_staff_worker_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.user_id
      AND role IN ('admin','manager','ads_manager','moderator')
  ) THEN
    RAISE EXCEPTION 'Staff users (admin/manager/ads_manager/moderator) cannot be registered as workers.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_staff_worker_insert ON public.workers;
CREATE TRIGGER trg_prevent_staff_worker_insert
BEFORE INSERT ON public.workers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_staff_worker_insert();