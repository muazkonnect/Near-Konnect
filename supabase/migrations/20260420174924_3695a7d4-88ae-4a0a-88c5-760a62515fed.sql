-- Normalize empty strings to NULL
UPDATE public.profiles SET phone = NULL WHERE phone IS NOT NULL AND length(trim(phone)) = 0;

-- Deduplicate: keep the oldest profile per phone, null out phone on newer duplicates
WITH ranked AS (
  SELECT id, phone, ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at ASC, id ASC) AS rn
  FROM public.profiles
  WHERE phone IS NOT NULL
)
UPDATE public.profiles p
SET phone = NULL
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;

-- Unique constraint on phone (partial index allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx ON public.profiles (phone) WHERE phone IS NOT NULL;

-- RPC to check if a phone number is already registered (callable by anon for pre-signup validation)
CREATE OR REPLACE FUNCTION public.phone_exists(_phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE phone = _phone
  );
$$;

GRANT EXECUTE ON FUNCTION public.phone_exists(text) TO anon, authenticated;