
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
