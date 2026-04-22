ALTER TABLE public.native_ads
  ADD COLUMN IF NOT EXISTS target_latitude double precision,
  ADD COLUMN IF NOT EXISTS target_longitude double precision,
  ADD COLUMN IF NOT EXISTS target_radius_km integer;

CREATE INDEX IF NOT EXISTS idx_native_ads_placement_active
  ON public.native_ads (placement, is_active);