
-- Add uid column
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS uid text UNIQUE;

-- Generator function: NK-XXXXXX (6 chars from base32-ish alphabet, no ambiguous chars)
CREATE OR REPLACE FUNCTION public.generate_worker_uid()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
  exists_already boolean;
BEGIN
  LOOP
    candidate := 'NK-';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.workers WHERE uid = candidate) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Trigger to auto-assign uid on insert
CREATE OR REPLACE FUNCTION public.set_worker_uid()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.uid IS NULL OR NEW.uid = '' THEN
    NEW.uid := public.generate_worker_uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workers_set_uid ON public.workers;
CREATE TRIGGER workers_set_uid
BEFORE INSERT ON public.workers
FOR EACH ROW
EXECUTE FUNCTION public.set_worker_uid();

-- Backfill existing rows
UPDATE public.workers SET uid = public.generate_worker_uid() WHERE uid IS NULL;
