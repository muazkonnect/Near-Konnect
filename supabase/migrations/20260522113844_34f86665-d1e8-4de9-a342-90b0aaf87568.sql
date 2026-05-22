-- Helper: broadcast push to all admins
CREATE OR REPLACE FUNCTION public.push_to_admins(_title text, _body text, _url text, _tag text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    PERFORM public.invoke_send_push(r.user_id, _title, _body, _url, _tag, false);
  END LOOP;
END;
$$;

-- Featured requests
CREATE OR REPLACE FUNCTION public.push_on_featured_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO _name FROM public.profiles WHERE user_id = NEW.user_id;
    PERFORM public.push_to_admins(
      'Featured request',
      COALESCE(_name, 'A worker') || ' requested to be featured',
      '/admin',
      'featreq-' || NEW.id::text
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pending' THEN
    PERFORM public.invoke_send_push(
      NEW.user_id,
      'Featured request ' || NEW.status,
      'Your featured request was ' || NEW.status,
      '/worker-dashboard',
      'featreq-upd-' || NEW.id::text,
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_on_featured_request_ins ON public.featured_requests;
DROP TRIGGER IF EXISTS push_on_featured_request_upd ON public.featured_requests;
CREATE TRIGGER push_on_featured_request_ins
AFTER INSERT ON public.featured_requests
FOR EACH ROW EXECUTE FUNCTION public.push_on_featured_request();
CREATE TRIGGER push_on_featured_request_upd
AFTER UPDATE ON public.featured_requests
FOR EACH ROW EXECUTE FUNCTION public.push_on_featured_request();

-- Avatar reset requests
CREATE OR REPLACE FUNCTION public.push_on_avatar_reset_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO _name FROM public.profiles WHERE user_id = NEW.user_id;
    PERFORM public.push_to_admins(
      'Avatar reset request',
      COALESCE(_name, 'A user') || ' requested an avatar reset',
      '/admin',
      'avreset-' || NEW.id::text
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pending' THEN
    PERFORM public.invoke_send_push(
      NEW.user_id,
      'Avatar reset ' || NEW.status,
      'Your avatar reset request was ' || NEW.status,
      '/dashboard',
      'avreset-upd-' || NEW.id::text,
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_on_avatar_reset_request_ins ON public.avatar_reset_requests;
DROP TRIGGER IF EXISTS push_on_avatar_reset_request_upd ON public.avatar_reset_requests;
CREATE TRIGGER push_on_avatar_reset_request_ins
AFTER INSERT ON public.avatar_reset_requests
FOR EACH ROW EXECUTE FUNCTION public.push_on_avatar_reset_request();
CREATE TRIGGER push_on_avatar_reset_request_upd
AFTER UPDATE ON public.avatar_reset_requests
FOR EACH ROW EXECUTE FUNCTION public.push_on_avatar_reset_request();

-- Worker location change requests
CREATE OR REPLACE FUNCTION public.push_on_location_change_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO _name FROM public.profiles WHERE user_id = NEW.worker_user_id;
    PERFORM public.push_to_admins(
      'Location change request',
      COALESCE(_name, 'A worker') || ' requested a location change',
      '/admin',
      'locreq-' || NEW.id::text
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pending' THEN
    PERFORM public.invoke_send_push(
      NEW.worker_user_id,
      'Location change ' || NEW.status,
      COALESCE(NEW.admin_comment, 'Your location change request was ' || NEW.status),
      '/worker-dashboard',
      'locreq-upd-' || NEW.id::text,
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_on_location_change_request_ins ON public.worker_location_change_requests;
DROP TRIGGER IF EXISTS push_on_location_change_request_upd ON public.worker_location_change_requests;
CREATE TRIGGER push_on_location_change_request_ins
AFTER INSERT ON public.worker_location_change_requests
FOR EACH ROW EXECUTE FUNCTION public.push_on_location_change_request();
CREATE TRIGGER push_on_location_change_request_upd
AFTER UPDATE ON public.worker_location_change_requests
FOR EACH ROW EXECUTE FUNCTION public.push_on_location_change_request();

-- Payment requests
CREATE OR REPLACE FUNCTION public.push_on_payment_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO _name FROM public.profiles WHERE user_id = NEW.user_id;
    PERFORM public.push_to_admins(
      'Payment request',
      COALESCE(_name, 'A user') || ' requested ' || NEW.sparks_amount || ' sparks (' || NEW.price_amount || ' ' || NEW.currency || ')',
      '/admin',
      'payreq-' || NEW.id::text
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pending' THEN
    PERFORM public.invoke_send_push(
      NEW.user_id,
      'Payment request ' || NEW.status,
      COALESCE(NEW.admin_note, 'Your payment request was ' || NEW.status),
      '/wallet',
      'payreq-upd-' || NEW.id::text,
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_on_payment_request_ins ON public.payment_requests;
DROP TRIGGER IF EXISTS push_on_payment_request_upd ON public.payment_requests;
CREATE TRIGGER push_on_payment_request_ins
AFTER INSERT ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.push_on_payment_request();
CREATE TRIGGER push_on_payment_request_upd
AFTER UPDATE ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.push_on_payment_request();

-- Reviews → notify the worker
CREATE OR REPLACE FUNCTION public.push_on_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _worker_user uuid;
  _customer_name text;
BEGIN
  SELECT user_id INTO _worker_user FROM public.workers WHERE id = NEW.worker_id;
  IF _worker_user IS NULL THEN RETURN NEW; END IF;
  SELECT full_name INTO _customer_name FROM public.profiles WHERE user_id = NEW.customer_id;
  PERFORM public.invoke_send_push(
    _worker_user,
    'New ' || NEW.rating || '★ review',
    COALESCE(_customer_name, 'A customer') || ' left you a review',
    '/worker-dashboard',
    'review-' || NEW.id::text,
    false
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_on_review_ins ON public.reviews;
CREATE TRIGGER push_on_review_ins
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.push_on_review();

-- Booking status changes
CREATE OR REPLACE FUNCTION public.push_on_booking_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _worker_user uuid;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  -- Notify the customer
  PERFORM public.invoke_send_push(
    NEW.customer_id,
    'Booking ' || NEW.status,
    COALESCE(NEW.service_description, '') || ' on ' || NEW.booking_date::text,
    '/dashboard',
    'book-upd-' || NEW.id::text || '-' || NEW.status,
    false
  );
  -- Notify the worker (worker_id is workers.id, look up user_id)
  SELECT user_id INTO _worker_user FROM public.workers WHERE id = NEW.worker_id;
  IF _worker_user IS NOT NULL THEN
    PERFORM public.invoke_send_push(
      _worker_user,
      'Booking ' || NEW.status,
      COALESCE(NEW.service_description, '') || ' on ' || NEW.booking_date::text,
      '/worker-dashboard',
      'book-upd-w-' || NEW.id::text || '-' || NEW.status,
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_on_booking_status_upd ON public.bookings;
CREATE TRIGGER push_on_booking_status_upd
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.push_on_booking_status();