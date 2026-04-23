
-- 1. Ad events table for impressions and clicks
CREATE TABLE IF NOT EXISTS public.ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.native_ads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  placement TEXT,
  viewer_user_id UUID,
  viewer_latitude DOUBLE PRECISION,
  viewer_longitude DOUBLE PRECISION,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_events_ad_id ON public.ad_events(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_created_at ON public.ad_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_events_type ON public.ad_events(event_type);

ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert tracking events
DROP POLICY IF EXISTS "Anyone can record ad events" ON public.ad_events;
CREATE POLICY "Anyone can record ad events"
  ON public.ad_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type IN ('impression', 'click')
    AND ad_id IS NOT NULL
  );

-- Only admins can read events
DROP POLICY IF EXISTS "Admins can read ad events" ON public.ad_events;
CREATE POLICY "Admins can read ad events"
  ON public.ad_events
  FOR SELECT
  TO authenticated
  USING (has_role('admin'::app_role, auth.uid()));

-- 2. Aggregated stats function
CREATE OR REPLACE FUNCTION public.get_ad_stats(_days INTEGER DEFAULT 30)
RETURNS TABLE (
  ad_id UUID,
  impressions BIGINT,
  clicks BIGINT,
  ctr NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ad_id,
    COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions,
    COUNT(*) FILTER (WHERE event_type = 'click') AS clicks,
    CASE
      WHEN COUNT(*) FILTER (WHERE event_type = 'impression') > 0
        THEN ROUND(
          (COUNT(*) FILTER (WHERE event_type = 'click')::NUMERIC
            / COUNT(*) FILTER (WHERE event_type = 'impression')::NUMERIC) * 100,
          2
        )
      ELSE 0
    END AS ctr
  FROM public.ad_events
  WHERE created_at >= now() - (_days || ' days')::INTERVAL
  GROUP BY ad_id;
$$;

REVOKE ALL ON FUNCTION public.get_ad_stats(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ad_stats(INTEGER) TO authenticated;

-- 3. Ad images public storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-images', 'ad-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read on ad images
DROP POLICY IF EXISTS "Ad images publicly readable" ON storage.objects;
CREATE POLICY "Ad images publicly readable"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'ad-images');

-- Only admins can upload/update/delete
DROP POLICY IF EXISTS "Admins can upload ad images" ON storage.objects;
CREATE POLICY "Admins can upload ad images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ad-images' AND has_role('admin'::app_role, auth.uid()));

DROP POLICY IF EXISTS "Admins can update ad images" ON storage.objects;
CREATE POLICY "Admins can update ad images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'ad-images' AND has_role('admin'::app_role, auth.uid()));

DROP POLICY IF EXISTS "Admins can delete ad images" ON storage.objects;
CREATE POLICY "Admins can delete ad images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'ad-images' AND has_role('admin'::app_role, auth.uid()));
