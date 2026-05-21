CREATE OR REPLACE FUNCTION public.match_workers_for_query(p_lat double precision, p_lon double precision, p_radius_km integer DEFAULT 10, p_main_category text DEFAULT NULL::text, p_sub_category text DEFAULT NULL::text, p_tags text[] DEFAULT NULL::text[], p_limit integer DEFAULT 5)
 RETURNS TABLE(id uuid, user_id uuid, uid text, full_name text, avatar_url text, profession text, experience integer, verified boolean, city text, main_category text, sub_category text, expertise_tags text[], latitude double precision, longitude double precision, distance_km double precision, avg_rating numeric, review_count integer, is_featured boolean, score double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT
      w.id, w.user_id, w.uid, w.profession, w.experience, w.verified, w.city,
      w.main_category, w.sub_category, w.expertise_tags, w.latitude, w.longitude,
      CASE
        WHEN p_lat IS NULL OR p_lon IS NULL OR w.workplace_location IS NULL THEN NULL
        ELSE ST_Distance(
          w.workplace_location,
          ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
        ) / 1000.0
      END AS distance_km
    FROM public.workers w
    WHERE w.available = true
      AND (
        -- If no category/tag filters at all, accept everyone
        (p_main_category IS NULL AND p_sub_category IS NULL AND (p_tags IS NULL OR array_length(p_tags,1) IS NULL))
        OR
        -- Fuzzy match: any provided term appears in main/sub/profession or expertise_tags
        (
          (p_main_category IS NOT NULL AND (
             w.main_category ILIKE '%' || p_main_category || '%'
             OR w.sub_category ILIKE '%' || p_main_category || '%'
             OR w.profession    ILIKE '%' || p_main_category || '%'
             OR EXISTS (SELECT 1 FROM unnest(w.expertise_tags) t WHERE t ILIKE '%' || p_main_category || '%')
          ))
          OR
          (p_sub_category IS NOT NULL AND (
             w.main_category ILIKE '%' || p_sub_category || '%'
             OR w.sub_category ILIKE '%' || p_sub_category || '%'
             OR w.profession    ILIKE '%' || p_sub_category || '%'
             OR EXISTS (SELECT 1 FROM unnest(w.expertise_tags) t WHERE t ILIKE '%' || p_sub_category || '%')
          ))
          OR
          (p_tags IS NOT NULL AND array_length(p_tags,1) IS NOT NULL AND EXISTS (
             SELECT 1 FROM unnest(p_tags) qt
             WHERE w.main_category ILIKE '%' || qt || '%'
                OR w.sub_category ILIKE '%' || qt || '%'
                OR w.profession    ILIKE '%' || qt || '%'
                OR EXISTS (SELECT 1 FROM unnest(w.expertise_tags) t WHERE t ILIKE '%' || qt || '%')
          ))
        )
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
    e.id, e.user_id, e.uid,
    COALESCE(p.full_name, '') AS full_name,
    p.avatar_url, e.profession, e.experience, e.verified, e.city,
    e.main_category, e.sub_category, e.expertise_tags,
    e.latitude, e.longitude, e.distance_km,
    e.avg_rating, e.review_count, e.is_featured,
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
$function$;