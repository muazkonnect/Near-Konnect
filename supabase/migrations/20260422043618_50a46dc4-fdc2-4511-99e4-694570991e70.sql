CREATE OR REPLACE FUNCTION public.notify_contact_reveal_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.invoke_send_push(
    _user_id := NEW.worker_user_id,
    _title := 'Contact request',
    _body := 'A client requested to view your contact info',
    _tag := 'contact_reveal_request',
    _urgent := false,
    _url := '/messages'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_contact_reveal_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','denied') THEN
    PERFORM public.invoke_send_push(
      _user_id := NEW.client_user_id,
      _title := CASE WHEN NEW.status = 'approved' THEN 'Contact unlocked' ELSE 'Contact request denied' END,
      _body := CASE WHEN NEW.status = 'approved' THEN 'The worker approved your contact request' ELSE 'The worker denied your contact request' END,
      _tag := 'contact_reveal_decision',
      _urgent := false,
      _url := '/messages'
    );
  END IF;
  RETURN NEW;
END;
$$;