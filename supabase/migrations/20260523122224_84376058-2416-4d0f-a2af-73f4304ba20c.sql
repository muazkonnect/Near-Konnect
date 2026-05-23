CREATE TABLE IF NOT EXISTS public.admin_pins (
  user_id UUID PRIMARY KEY,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_pins ENABLE ROW LEVEL SECURITY;

-- No policies: only service role (edge functions) accesses this table.

CREATE OR REPLACE FUNCTION public.touch_admin_pins_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_pins_updated_at ON public.admin_pins;
CREATE TRIGGER trg_admin_pins_updated_at
BEFORE UPDATE ON public.admin_pins
FOR EACH ROW EXECUTE FUNCTION public.touch_admin_pins_updated_at();