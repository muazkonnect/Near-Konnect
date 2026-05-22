CREATE OR REPLACE FUNCTION public.trg_push_on_booking_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  worker_user_id UUID;
  status_label TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO worker_user_id FROM public.workers WHERE id = NEW.worker_id;

  status_label := CASE NEW.status
    WHEN 'accepted'  THEN 'accepted'
    WHEN 'confirmed' THEN 'confirmed'
    WHEN 'declined'  THEN 'declined'
    WHEN 'rejected'  THEN 'declined'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'canceled'  THEN 'cancelled'
    WHEN 'completed' THEN 'completed'
    ELSE NEW.status
  END;

  -- Notify the customer when the worker changes status
  IF auth.uid() IS DISTINCT FROM NEW.customer_id THEN
    PERFORM public.invoke_send_push(
      NEW.customer_id,
      'Booking ' || status_label,
      COALESCE(NEW.service_description, '') || ' on ' || NEW.booking_date::text,
      '/dashboard',
      'book-status-' || NEW.id::text,
      NEW.status IN ('accepted','confirmed','declined','rejected','cancelled','canceled')
    );
  END IF;

  -- Notify the worker when the customer cancels
  IF NEW.status IN ('cancelled','canceled') AND auth.uid() IS DISTINCT FROM worker_user_id AND worker_user_id IS NOT NULL THEN
    PERFORM public.invoke_send_push(
      worker_user_id,
      'Booking cancelled',
      COALESCE(NEW.service_description, '') || ' on ' || NEW.booking_date::text,
      '/worker-dashboard',
      'book-status-' || NEW.id::text,
      false
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS push_on_booking_status ON public.bookings;
CREATE TRIGGER push_on_booking_status
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.trg_push_on_booking_status();