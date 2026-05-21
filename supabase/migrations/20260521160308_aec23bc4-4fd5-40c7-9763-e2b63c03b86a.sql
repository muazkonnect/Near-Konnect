
ALTER TABLE public.chatbot_messages
ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.match_workers_for_query(
  p_lat double precision,
  p_lon double precision,
  p_radius_km integer DEFAULT 10,
  p_main_category text DEFAULT NULL,
  p_sub_category text DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  uid text,
  full_name text,
  avatar_url text,
  profession text,
  experience integer,
  verified boolean,
  city text,
  main_category text,
  sub_category text,
  expertise_tags text[],
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  avg_rating numeric,
  review_count integer,
  is_featured boolean,
  score double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      w.id,
      w.user_id,
      w.uid,
      w.profession,
      w.experience,
      w.verified,
      w.city,
      w.main_category,
      w.sub_category,
      w.expertise_tags,
      w.latitude,
      w.longitude,
      CASE
        WHEN p_lat IS NULL OR p_lon IS NULL OR w.workplace_location IS NULL THEN NULL
        ELSE ST_Distance(
          w.workplace_location,
          ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
        ) / 1000.0
      END AS distance_km
    FROM public.workers w
    WHERE w.available = true
      AND (p_main_category IS NULL OR w.main_category ILIKE p_main_category)
      AND (p_sub_category IS NULL OR w.sub_category ILIKE p_sub_category)
      AND (
        p_tags IS NULL
        OR array_length(p_tags, 1) IS NULL
        OR w.expertise_tags && p_tags
      )
  ),
  filtered AS (
    SELECT * FROM base
    WHERE distance_km IS NULL OR distance_km <= p_radius_km
  ),
  enriched AS (
    SELECT
      f.*,
      COALESCE(r.avg_rating, 0)::numeric AS avg_rating,
      COALESCE(r.review_count, 0)::integer AS review_count,
      EXISTS (
        SELECT 1 FROM public.featured_workers fw
        WHERE fw.worker_id = f.id
          AND fw.status = 'active'
          AND fw.starts_at <= now()
          AND fw.ends_at >= now()
      ) AS is_featured
    FROM filtered f
    LEFT JOIN LATERAL (
      SELECT AVG(rating)::numeric AS avg_rating, COUNT(*)::integer AS review_count
      FROM public.reviews rv
      WHERE rv.worker_id = f.id
    ) r ON true
  )
  SELECT
    e.id,
    e.user_id,
    e.uid,
    COALESCE(p.full_name, '') AS full_name,
    p.avatar_url,
    e.profession,
    e.experience,
    e.verified,
    e.city,
    e.main_category,
    e.sub_category,
    e.expertise_tags,
    e.latitude,
    e.longitude,
    e.distance_km,
    e.avg_rating,
    e.review_count,
    e.is_featured,
    (
      (1.0 / (COALESCE(e.distance_km, 0) + 0.5))
      + (CASE WHEN e.verified THEN 0.4 ELSE 0 END)
      + (CASE WHEN e.is_featured THEN 0.3 ELSE 0 END)
      + (COALESCE(e.avg_rating, 0)::double precision / 5.0) * 0.5
    ) AS score
  FROM enriched e
  LEFT JOIN public.profiles p ON p.user_id = e.user_id
  ORDER BY score DESC NULLS LAST, e.distance_km ASC NULLS LAST
  LIMIT GREATEST(1, LEAST(p_limit, 20));
$$;

GRANT EXECUTE ON FUNCTION public.match_workers_for_query(
  double precision, double precision, integer, text, text, text[], integer
) TO anon, authenticated;
