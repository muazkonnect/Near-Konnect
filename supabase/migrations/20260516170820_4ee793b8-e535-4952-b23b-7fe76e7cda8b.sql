
CREATE TABLE public.worker_location_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_user_id uuid NOT NULL,
  current_latitude double precision,
  current_longitude double precision,
  requested_latitude double precision NOT NULL,
  requested_longitude double precision NOT NULL,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  admin_comment text NOT NULL DEFAULT '',
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_location_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers insert own location request"
ON public.worker_location_change_requests
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = worker_user_id AND status = 'pending');

CREATE POLICY "Workers and admins can view"
ON public.worker_location_change_requests
FOR SELECT TO authenticated
USING (auth.uid() = worker_user_id OR public.has_role('admin'::app_role, auth.uid()));

CREATE POLICY "Admins update location request"
ON public.worker_location_change_requests
FOR UPDATE TO authenticated
USING (public.has_role('admin'::app_role, auth.uid()))
WITH CHECK (public.has_role('admin'::app_role, auth.uid()));

CREATE POLICY "Admins delete location request"
ON public.worker_location_change_requests
FOR DELETE TO authenticated
USING (public.has_role('admin'::app_role, auth.uid()));

CREATE INDEX idx_wlcr_status ON public.worker_location_change_requests(status);
CREATE INDEX idx_wlcr_worker ON public.worker_location_change_requests(worker_user_id);

CREATE TRIGGER trg_wlcr_updated
BEFORE UPDATE ON public.worker_location_change_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
