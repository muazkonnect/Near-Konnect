-- Add location columns
ALTER TABLE public.blood_requests
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Nearby donors RPC (no contact fields exposed)
CREATE OR REPLACE FUNCTION public.get_nearby_blood_donors(
  req_lat double precision,
  req_lng double precision,
  req_blood_group text,
  radius_km double precision DEFAULT 15
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  city text,
  blood_group text,
  distance_km double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.full_name,
    p.city,
    p.blood_group,
    (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(req_lat)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians(req_lng)) +
          sin(radians(req_lat)) * sin(radians(p.latitude))
        ))
      )
    ) AS distance_km
  FROM public.profiles p
  WHERE p.is_blood_donor = true
    AND p.blood_group = req_blood_group
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(req_lat)) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians(req_lng)) +
          sin(radians(req_lat)) * sin(radians(p.latitude))
        ))
      )
    ) <= radius_km
  ORDER BY distance_km ASC
  LIMIT 200;
$$;

-- Nearby blood requests RPC for donors
CREATE OR REPLACE FUNCTION public.get_nearby_blood_requests(
  donor_lat double precision,
  donor_lng double precision,
  donor_blood_group text,
  radius_km double precision DEFAULT 25
)
RETURNS TABLE (
  id uuid,
  requester_id uuid,
  requester_name text,
  blood_group text,
  urgency text,
  city text,
  message text,
  created_at timestamptz,
  distance_km double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    br.id,
    br.requester_id,
    p.full_name AS requester_name,
    br.blood_group,
    br.urgency,
    br.city,
    br.message,
    br.created_at,
    CASE
      WHEN br.latitude IS NULL OR br.longitude IS NULL THEN NULL
      ELSE (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(donor_lat)) * cos(radians(br.latitude)) *
            cos(radians(br.longitude) - radians(donor_lng)) +
            sin(radians(donor_lat)) * sin(radians(br.latitude))
          ))
        )
      )
    END AS distance_km
  FROM public.blood_requests br
  LEFT JOIN public.profiles p ON p.user_id = br.requester_id
  WHERE br.status = 'open'
    AND br.blood_group = donor_blood_group
    AND (
      br.latitude IS NULL OR br.longitude IS NULL OR
      (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(donor_lat)) * cos(radians(br.latitude)) *
            cos(radians(br.longitude) - radians(donor_lng)) +
            sin(radians(donor_lat)) * sin(radians(br.latitude))
          ))
        )
      ) <= radius_km
    )
  ORDER BY
    CASE br.urgency WHEN 'critical' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
    distance_km ASC NULLS LAST,
    br.created_at DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_blood_donors(double precision, double precision, text, double precision) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_nearby_blood_requests(double precision, double precision, text, double precision) TO authenticated;