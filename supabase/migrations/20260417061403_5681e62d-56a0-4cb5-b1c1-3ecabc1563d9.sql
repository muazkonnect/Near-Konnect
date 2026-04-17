CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS workplace_location geography(POINT, 4326);

CREATE INDEX IF NOT EXISTS idx_workers_location
ON public.workers USING GIST (workplace_location);