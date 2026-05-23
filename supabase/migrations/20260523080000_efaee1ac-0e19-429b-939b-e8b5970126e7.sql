
-- Sequential invoice numbers for approved payment requests
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS invoice_number bigint UNIQUE,
  ADD COLUMN IF NOT EXISTS invoiced_at timestamptz;

CREATE SEQUENCE IF NOT EXISTS public.payment_invoice_seq START 1000 INCREMENT 1;

CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.invoice_number IS NULL THEN
    NEW.invoice_number := nextval('public.payment_invoice_seq');
    NEW.invoiced_at := COALESCE(NEW.invoiced_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_invoice_number ON public.payment_requests;
CREATE TRIGGER trg_assign_invoice_number
BEFORE INSERT OR UPDATE OF status ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_number();

-- Backfill existing approved rows in chronological order
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id FROM public.payment_requests
    WHERE status = 'approved' AND invoice_number IS NULL
    ORDER BY COALESCE(decided_at, created_at) ASC, created_at ASC
  LOOP
    UPDATE public.payment_requests
    SET invoice_number = nextval('public.payment_invoice_seq'),
        invoiced_at = COALESCE(decided_at, created_at)
    WHERE id = r.id;
  END LOOP;
END $$;
