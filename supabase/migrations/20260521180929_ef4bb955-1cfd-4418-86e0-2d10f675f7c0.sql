CREATE OR REPLACE FUNCTION public.match_workers_for_query(
  p_lat double precision,
  p_lon double precision,
  p_radius_km integer DEFAULT 10,
  p_main_category text DEFAULT NULL::text,
  p_sub_category text DEFAULT NULL::text,
  p_tags text[] DEFAULT NULL::text[],
  p_limit integer DEFAULT 5
)
RETURNS TABLE(
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH input_terms AS (
    SELECT DISTINCT lower(trim(term)) AS term
    FROM unnest(array_remove(ARRAY[p_main_category, p_sub_category], NULL) || COALESCE(p_tags, ARRAY[]::text[])) AS term
    WHERE NULLIF(trim(term), '') IS NOT NULL
  ),
  alias_terms AS (
    SELECT DISTINCT alias
    FROM input_terms it
    CROSS JOIN LATERAL unnest(
      CASE
        WHEN it.term ~ '(carpent|carpentry|wood|furniture|wardrobe|cabinet|door|window)'
          THEN ARRAY['carpenter','carpentry','carpent','wood','woodwork','furniture','wardrobe','cabinet','door','window']::text[]
        WHEN it.term ~ '(plumb|pipe|tap|leak|geyser|bathroom|toilet)'
          THEN ARRAY['plumber','plumbing','plumb','pipe','tap','leak','geyser','bathroom','toilet']::text[]
        WHEN it.term ~ '(electric|wiring|wire|light|fan|switch|socket|ups)'
          THEN ARRAY['electrician','electrical','electric','wiring','wire','light','fan','switch','socket','ups']::text[]
        WHEN it.term ~ '(^|[^a-z])(ac|a/c)([^a-z]|$)|air condition|cooling|hvac'
          THEN ARRAY['ac','a/c','air conditioner','air conditioning','cooling','hvac','technician']::text[]
        WHEN it.term ~ '(paint|wall|colour|color)'
          THEN ARRAY['painter','painting','paint','wall','colour','color']::text[]
        WHEN it.term ~ '(mason|masonry|construct|brick|cement|tile)'
          THEN ARRAY['mason','masonry','construction','brick','cement','tiles','tile']::text[]
        WHEN it.term ~ '(mechanic|car|bike|motor|vehicle)'
          THEN ARRAY['mechanic','car','bike','motor','vehicle','auto']::text[]
        ELSE ARRAY[]::text[]
      END
    ) AS alias
  ),
  needles AS (
    SELECT DISTINCT needle
    FROM (
      SELECT term AS needle FROM input_terms
      UNION ALL
      SELECT alias AS needle FROM alias_terms
      UNION ALL
      SELECT regexp_replace(term, '(ing|ers|er|ry|ian|ical|al|ics|s)$', '') AS needle
      FROM input_terms
      WHERE length(term) > 4
    ) n
    WHERE length(needle) >= 3
  ),
  base AS (
    SELECT
      w.id, w.user_id, w.uid, w.profession, w.experience, w.verified, w.city,
      w.main_category, w.sub_category, w.expertise_tags, w.latitude, w.longitude,
      CASE
        WHEN p_lat IS NULL OR p_lon IS NULL OR w.workplace_location IS NULL THEN NULL
        ELSE ST_Distance(
          w.workplace_location,
          ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
        ) / 1000.0
      END AS distance_km,
      CASE
        WHEN NOT EXISTS (SELECT 1 FROM needles) THEN 0.0
        ELSE COALESCE((
          SELECT MAX(
            CASE
              WHEN lower(COALESCE(w.profession, '')) = nd.needle OR lower(COALESCE(w.sub_category, '')) = nd.needle THEN 1.0
              WHEN lower(COALESCE(w.profession, '')) ILIKE '%' || nd.needle || '%' OR lower(COALESCE(w.sub_category, '')) ILIKE '%' || nd.needle || '%' THEN 0.8
              WHEN lower(COALESCE(w.main_category, '')) ILIKE '%' || nd.needle || '%' THEN 0.5
              WHEN lower(COALESCE(array_to_string(w.expertise_tags, ' '), '')) ILIKE '%' || nd.needle || '%' THEN 0.6
              ELSE 0.0
            END
          )
          FROM needles nd
          WHERE lower(concat_ws(' ', w.main_category, w.sub_category, w.profession, array_to_string(w.expertise_tags, ' '))) ILIKE '%' || nd.needle || '%'
        ), 0.0)
      END AS match_score
    FROM public.workers w
    WHERE w.available = true
      AND (
        NOT EXISTS (SELECT 1 FROM needles)
        OR EXISTS (
          SELECT 1
          FROM needles nd
          WHERE lower(concat_ws(' ', w.main_category, w.sub_category, w.profession, array_to_string(w.expertise_tags, ' '))) ILIKE '%' || nd.needle || '%'
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
      e.match_score
      + (1.0 / (COALESCE(e.distance_km, 0) + 0.5))
      + (CASE WHEN e.verified THEN 0.4 ELSE 0 END)
      + (CASE WHEN e.is_featured THEN 0.3 ELSE 0 END)
      + (COALESCE(e.avg_rating, 0)::double precision / 5.0) * 0.5
    ) AS score
  FROM enriched e
  LEFT JOIN public.profiles p ON p.user_id = e.user_id
  ORDER BY score DESC NULLS LAST, e.distance_km ASC NULLS LAST
  LIMIT GREATEST(1, LEAST(p_limit, 20));
$function$;

GRANT EXECUTE ON FUNCTION public.match_workers_for_query(double precision, double precision, integer, text, text, text[], integer) TO anon, authenticated;