-- 1. Table
CREATE TABLE public.contact_reveals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_user_id UUID NOT NULL,
  client_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  request_message TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contact_reveals_distinct_users CHECK (worker_user_id <> client_user_id),
  CONSTRAINT contact_reveals_unique_pair UNIQUE (worker_user_id, client_user_id)
);

CREATE INDEX idx_contact_reveals_worker ON public.contact_reveals(worker_user_id);
CREATE INDEX idx_contact_reveals_client ON public.contact_reveals(client_user_id);

-- 2. updated_at trigger
CREATE TRIGGER contact_reveals_set_updated_at
BEFORE UPDATE ON public.contact_reveals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. RLS
ALTER TABLE public.contact_reveals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants and admins can view reveals"
  ON public.contact_reveals FOR SELECT
  TO authenticated
  USING (
    auth.uid() = worker_user_id
    OR auth.uid() = client_user_id
    OR has_role('admin'::app_role, auth.uid())
  );

CREATE POLICY "Clients can create pending reveal requests"
  ON public.contact_reveals FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = client_user_id
    AND status = 'pending'
    AND worker_user_id <> auth.uid()
  );

CREATE POLICY "Workers and admins can update reveal status"
  ON public.contact_reveals FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = worker_user_id OR has_role('admin'::app_role, auth.uid())
  )
  WITH CHECK (
    auth.uid() = worker_user_id OR has_role('admin'::app_role, auth.uid())
  );

CREATE POLICY "Admins can delete reveals"
  ON public.contact_reveals FOR DELETE
  TO authenticated
  USING (has_role('admin'::app_role, auth.uid()));

-- 4. Helper function: can a viewer see owner's contact?
CREATE OR REPLACE FUNCTION public.can_view_contact(_viewer UUID, _owner UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _viewer = _owner
    OR public.has_role('admin'::app_role, _viewer)
    OR EXISTS (
      SELECT 1 FROM public.contact_reveals
      WHERE worker_user_id = _owner
        AND client_user_id = _viewer
        AND status = 'approved'
    );
$$;

-- 5. Push-notification triggers
CREATE OR REPLACE FUNCTION public.notify_contact_reveal_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_name TEXT;
BEGIN
  SELECT COALESCE(NULLIF(full_name,''),'Someone') INTO client_name
  FROM public.profiles WHERE user_id = NEW.client_user_id;

  PERFORM public.invoke_send_push(
    'New contact request',
    client_name || ' would like your contact details.',
    'contact-reveal-' || NEW.id::text,
    '/messages/' || NEW.client_user_id::text,
    true,
    NEW.worker_user_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER contact_reveals_after_insert_push
AFTER INSERT ON public.contact_reveals
FOR EACH ROW EXECUTE FUNCTION public.notify_contact_reveal_request();

CREATE OR REPLACE FUNCTION public.notify_contact_reveal_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  worker_name TEXT;
  title TEXT;
  body TEXT;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('approved','denied') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(full_name,''),'The worker') INTO worker_name
  FROM public.profiles WHERE user_id = NEW.worker_user_id;

  IF NEW.status = 'approved' THEN
    title := 'Contact unlocked';
    body := worker_name || ' shared their contact details with you.';
  ELSE
    title := 'Contact request declined';
    body := worker_name || ' declined to share contact details.';
  END IF;

  PERFORM public.invoke_send_push(
    title,
    body,
    'contact-reveal-' || NEW.id::text,
    '/messages/' || NEW.worker_user_id::text,
    NEW.status = 'approved',
    NEW.client_user_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER contact_reveals_after_update_push
AFTER UPDATE ON public.contact_reveals
FOR EACH ROW EXECUTE FUNCTION public.notify_contact_reveal_decision();