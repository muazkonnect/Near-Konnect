
-- Helper: is_verified_user
CREATE OR REPLACE FUNCTION public.is_verified_user(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.worker_verifications
    WHERE user_id = _uid
      AND (status = 'approved' OR verified_at IS NOT NULL)
  );
$$;

-- Helper: is_premium_or_featured_worker (active featured row)
CREATE OR REPLACE FUNCTION public.is_premium_or_featured_worker(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.featured_workers
    WHERE user_id = _uid
      AND status = 'active'
      AND starts_at <= now()
      AND ends_at >= now()
  );
$$;

-- Job requests table
CREATE TABLE public.job_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL,
  main_category text NOT NULL,
  sub_category text NOT NULL,
  note text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  status text NOT NULL DEFAULT 'open',
  claimed_by_user_id uuid,
  claimed_at timestamptz,
  sparks_cost integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_requests_status_created ON public.job_requests (status, created_at DESC);
CREATE INDEX idx_job_requests_client ON public.job_requests (client_user_id);
CREATE INDEX idx_job_requests_claimed_by ON public.job_requests (claimed_by_user_id);

ALTER TABLE public.job_requests ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view open, unexpired requests; participants & admins always
CREATE POLICY "View job requests"
ON public.job_requests FOR SELECT
TO authenticated
USING (
  (status = 'open' AND expires_at > now())
  OR client_user_id = auth.uid()
  OR claimed_by_user_id = auth.uid()
  OR has_role('admin'::app_role, auth.uid())
);

-- Verified clients can insert their own job requests
CREATE POLICY "Verified clients post job requests"
ON public.job_requests FOR INSERT
TO authenticated
WITH CHECK (
  client_user_id = auth.uid()
  AND status = 'open'
  AND public.is_verified_user(auth.uid())
);

-- Premium/featured workers can claim an open request (update). Posters/admins can also update (close).
CREATE POLICY "Workers claim or owner closes job requests"
ON public.job_requests FOR UPDATE
TO authenticated
USING (
  has_role('admin'::app_role, auth.uid())
  OR client_user_id = auth.uid()
  OR (status = 'open' AND expires_at > now() AND public.is_premium_or_featured_worker(auth.uid()))
)
WITH CHECK (
  has_role('admin'::app_role, auth.uid())
  OR client_user_id = auth.uid()
  OR (claimed_by_user_id = auth.uid() AND status = 'claimed')
);

-- Posters and admins can delete
CREATE POLICY "Owner or admin deletes job request"
ON public.job_requests FOR DELETE
TO authenticated
USING (client_user_id = auth.uid() OR has_role('admin'::app_role, auth.uid()));

-- updated_at trigger
CREATE TRIGGER trg_job_requests_updated_at
BEFORE UPDATE ON public.job_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.job_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_requests;

-- Seed default app_settings keys
INSERT INTO public.app_settings (key, value, description) VALUES
  ('job_requests_enabled', 'true'::jsonb, 'Enable client job request ticker'),
  ('job_requests_radius_km', '5'::jsonb, 'Radius in km for visible nearby job requests'),
  ('job_requests_client_post_cost', '0'::jsonb, 'Sparks cost for a client to post a job (0=free)'),
  ('job_requests_worker_claim_cost', '0'::jsonb, 'Sparks cost for a worker to claim a job (0=free)'),
  ('job_requests_require_verified_client', 'true'::jsonb, 'Require verified client to post'),
  ('job_requests_require_premium_worker', 'true'::jsonb, 'Require premium/featured worker to claim'),
  ('job_requests_expiry_minutes', '120'::jsonb, 'Minutes until a job request auto-expires')
ON CONFLICT (key) DO NOTHING;
