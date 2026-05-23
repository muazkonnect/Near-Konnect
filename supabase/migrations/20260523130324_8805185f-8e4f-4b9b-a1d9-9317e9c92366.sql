
-- Fix mutable search_path on user-defined functions
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.generate_worker_uid()
RETURNS text LANGUAGE plpgsql SET search_path = public
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

CREATE OR REPLACE FUNCTION public.set_worker_uid()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.uid IS NULL OR NEW.uid = '' THEN
    NEW.uid := public.generate_worker_uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Deny-all RLS policies for admin_otp_codes and admin_pins (only service role access)
CREATE POLICY "Service role only - otp"
ON public.admin_otp_codes
AS RESTRICTIVE
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Service role only - pins"
ON public.admin_pins
AS RESTRICTIVE
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Realtime: restrict channel subscriptions so users can only subscribe to topics that contain their own UID
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='realtime' AND c.relname='messages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users subscribe to own topics" ON realtime.messages';
    EXECUTE $p$
      CREATE POLICY "Authenticated users subscribe to own topics"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (
        realtime.topic() LIKE '%' || auth.uid()::text || '%'
      )
    $p$;
  END IF;
END $$;
