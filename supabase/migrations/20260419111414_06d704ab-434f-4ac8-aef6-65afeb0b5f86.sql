-- Add contact_methods JSON array to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS contact_methods jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Validate structure: array of {type:text, value:text}; max 10 entries; values <= 64 chars
CREATE OR REPLACE FUNCTION public.validate_contact_methods()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  item jsonb;
  allowed text[] := ARRAY['phone','whatsapp','imo','botim','viber','telegram','signal'];
BEGIN
  IF NEW.contact_methods IS NULL THEN
    NEW.contact_methods := '[]'::jsonb;
  END IF;

  IF jsonb_typeof(NEW.contact_methods) <> 'array' THEN
    RAISE EXCEPTION 'contact_methods must be a JSON array';
  END IF;

  IF jsonb_array_length(NEW.contact_methods) > 10 THEN
    RAISE EXCEPTION 'contact_methods cannot have more than 10 entries';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(NEW.contact_methods) LOOP
    IF jsonb_typeof(item) <> 'object'
       OR NOT (item ? 'type') OR NOT (item ? 'value')
       OR jsonb_typeof(item->'type') <> 'string'
       OR jsonb_typeof(item->'value') <> 'string' THEN
      RAISE EXCEPTION 'each contact method must be {type, value} strings';
    END IF;

    IF NOT ((item->>'type') = ANY(allowed)) THEN
      RAISE EXCEPTION 'invalid contact method type: %', item->>'type';
    END IF;

    IF length(item->>'value') = 0 OR length(item->>'value') > 64 THEN
      RAISE EXCEPTION 'contact method value length must be 1-64 chars';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_contact_methods_trg ON public.profiles;
CREATE TRIGGER validate_contact_methods_trg
BEFORE INSERT OR UPDATE OF contact_methods ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_contact_methods();

-- Backfill: seed phone & whatsapp for existing users where applicable
UPDATE public.profiles
SET contact_methods = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object('type','phone','value', phone) AS elem
    WHERE phone IS NOT NULL AND length(trim(phone)) > 0
    UNION ALL
    SELECT jsonb_build_object('type','whatsapp','value', phone) AS elem
    WHERE use_whatsapp = true AND phone IS NOT NULL AND length(trim(phone)) > 0
  ) s
)
WHERE contact_methods = '[]'::jsonb;