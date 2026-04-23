
-- Featured requests (worker self-serve)
CREATE TABLE IF NOT EXISTS public.featured_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL,
  user_id UUID NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_at TIMESTAMPTZ,
  decided_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.featured_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can create own featured request"
ON public.featured_requests
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Workers and admins can view"
ON public.featured_requests
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR has_role('admin'::app_role, auth.uid()));

CREATE POLICY "Admins can manage requests"
ON public.featured_requests
FOR UPDATE TO authenticated
USING (has_role('admin'::app_role, auth.uid()))
WITH CHECK (has_role('admin'::app_role, auth.uid()));

CREATE POLICY "Admins can delete requests"
ON public.featured_requests
FOR DELETE TO authenticated
USING (has_role('admin'::app_role, auth.uid()));

CREATE TRIGGER trg_featured_requests_updated
BEFORE UPDATE ON public.featured_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Featured events (analytics)
CREATE TABLE IF NOT EXISTS public.featured_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  featured_id UUID,
  worker_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  viewer_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_featured_events_worker ON public.featured_events(worker_id);
CREATE INDEX IF NOT EXISTS idx_featured_events_created ON public.featured_events(created_at DESC);

ALTER TABLE public.featured_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record featured events"
ON public.featured_events
FOR INSERT TO anon, authenticated
WITH CHECK (event_type IN ('impression','contact_click') AND worker_id IS NOT NULL);

CREATE POLICY "Admins can read featured events"
ON public.featured_events
FOR SELECT TO authenticated
USING (has_role('admin'::app_role, auth.uid()));

-- Stats RPC
CREATE OR REPLACE FUNCTION public.get_featured_stats(_days INTEGER DEFAULT 30)
RETURNS TABLE (worker_id UUID, impressions BIGINT, clicks BIGINT, ctr NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    fe.worker_id,
    COUNT(*) FILTER (WHERE fe.event_type = 'impression') AS impressions,
    COUNT(*) FILTER (WHERE fe.event_type = 'contact_click') AS clicks,
    CASE WHEN COUNT(*) FILTER (WHERE fe.event_type = 'impression') > 0
      THEN ROUND( (COUNT(*) FILTER (WHERE fe.event_type = 'contact_click'))::NUMERIC
                 / (COUNT(*) FILTER (WHERE fe.event_type = 'impression'))::NUMERIC * 100, 2)
      ELSE 0 END AS ctr
  FROM public.featured_events fe
  WHERE fe.created_at >= now() - (_days || ' days')::INTERVAL
  GROUP BY fe.worker_id;
$$;
