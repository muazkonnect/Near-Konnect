CREATE OR REPLACE FUNCTION public.get_nearby_workers(
  lat double precision,
  lng double precision,
  radius_meters double precision DEFAULT 5000,
  max_results integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  name text,
  distance double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH origin AS (
    SELECT ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography AS g
  )
  SELECT
    w.id,
    COALESCE(p.full_name, w.profession) AS name,
    ST_Distance(w.workplace_location, o.g) AS distance
  FROM public.workers w
  CROSS JOIN origin o
  LEFT JOIN public.profiles p ON p.user_id = w.user_id
  WHERE w.workplace_location IS NOT NULL
    AND w.available = true
    AND ST_DWithin(w.workplace_location, o.g, radius_meters)
  ORDER BY w.workplace_location <-> o.g
  LIMIT GREATEST(max_results, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_workers(double precision, double precision, double precision, integer) TO anon, authenticated;