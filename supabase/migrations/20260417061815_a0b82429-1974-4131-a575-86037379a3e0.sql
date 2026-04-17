CREATE OR REPLACE FUNCTION public.set_worker_location(
  lat double precision,
  lng double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.workers
  SET workplace_location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      latitude = lat,
      longitude = lng,
      updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_worker_location(double precision, double precision) TO authenticated;