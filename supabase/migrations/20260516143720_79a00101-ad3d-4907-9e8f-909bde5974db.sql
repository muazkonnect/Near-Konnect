
-- 1. Reset requests table
CREATE TABLE IF NOT EXISTS public.avatar_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending', -- pending | approved | denied | consumed
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_one_open_reset
  ON public.avatar_reset_requests(user_id)
  WHERE status IN ('pending','approved');

ALTER TABLE public.avatar_reset_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own reset" ON public.avatar_reset_requests;
CREATE POLICY "Users insert own reset"
  ON public.avatar_reset_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Users view own reset" ON public.avatar_reset_requests;
CREATE POLICY "Users view own reset"
  ON public.avatar_reset_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role('admin'::app_role, auth.uid()));

DROP POLICY IF EXISTS "Admins manage reset" ON public.avatar_reset_requests;
CREATE POLICY "Admins manage reset"
  ON public.avatar_reset_requests FOR UPDATE TO authenticated
  USING (has_role('admin'::app_role, auth.uid()))
  WITH CHECK (has_role('admin'::app_role, auth.uid()));

DROP POLICY IF EXISTS "Admins delete reset" ON public.avatar_reset_requests;
CREATE POLICY "Admins delete reset"
  ON public.avatar_reset_requests FOR DELETE TO authenticated
  USING (has_role('admin'::app_role, auth.uid()));

-- 2. Restrict profile avatar_url updates: only service role can write it
CREATE OR REPLACE FUNCTION public.prevent_avatar_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  approved_id uuid;
BEGIN
  -- No change requested
  IF NEW.avatar_url IS NOT DISTINCT FROM OLD.avatar_url THEN
    RETURN NEW;
  END IF;

  -- Only the server (service_role) may ever write avatar_url
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'avatar_url can only be set by the server';
  END IF;

  -- First-time set is always allowed by service role
  IF OLD.avatar_url IS NULL OR OLD.avatar_url = '' THEN
    RETURN NEW;
  END IF;

  -- Replacement requires an approved reset request; consume it
  SELECT id INTO approved_id
  FROM public.avatar_reset_requests
  WHERE user_id = NEW.user_id AND status = 'approved'
  ORDER BY decided_at DESC NULLS LAST
  LIMIT 1;

  IF approved_id IS NULL THEN
    RAISE EXCEPTION 'Profile photo change requires an approved reset request';
  END IF;

  UPDATE public.avatar_reset_requests
  SET status = 'consumed', updated_at = now()
  WHERE id = approved_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_profile_avatar ON public.profiles;
CREATE TRIGGER lock_profile_avatar
BEFORE UPDATE OF avatar_url ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_avatar_change();

-- updated_at trigger for reset requests
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS touch_avatar_reset ON public.avatar_reset_requests;
CREATE TRIGGER touch_avatar_reset
BEFORE UPDATE ON public.avatar_reset_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
