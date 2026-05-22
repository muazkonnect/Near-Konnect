
-- Push: payment request status changes (approved/rejected)
CREATE OR REPLACE FUNCTION public.push_on_payment_request_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_title text; v_body text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'approved' THEN
    v_title := 'Payment approved 🎉';
    v_body := (COALESCE(NEW.sparks_amount,0) + COALESCE(NEW.bonus_sparks,0))::text || ' Sparks added to your wallet';
    PERFORM public.invoke_send_push(NEW.user_id, v_title, v_body, '/wallet', 'payment-' || NEW.id::text, false);
  ELSIF NEW.status = 'rejected' THEN
    v_title := 'Payment rejected';
    v_body := COALESCE(NULLIF(NEW.admin_note,''), 'Your payment request was rejected');
    PERFORM public.invoke_send_push(NEW.user_id, v_title, v_body, '/wallet', 'payment-' || NEW.id::text, false);
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS push_on_payment_request_status ON public.payment_requests;
CREATE TRIGGER push_on_payment_request_status
AFTER UPDATE OF status ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.push_on_payment_request_status();

-- Push: admin sparks adjustments (manual credit/debit)
CREATE OR REPLACE FUNCTION public.push_on_sparks_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_title text; v_body text;
BEGIN
  -- Only push for admin-initiated manual adjustments
  IF NEW.reason::text NOT IN ('admin_added', 'deduction') THEN
    RETURN NEW;
  END IF;

  IF NEW.delta > 0 THEN
    v_title := 'Sparks added';
    v_body := '+' || NEW.delta::text || ' Sparks' || COALESCE(' — ' || NULLIF(NEW.notes,''), '');
  ELSE
    v_title := 'Sparks deducted';
    v_body := NEW.delta::text || ' Sparks' || COALESCE(' — ' || NULLIF(NEW.notes,''), '');
  END IF;

  PERFORM public.invoke_send_push(NEW.owner_user_id, v_title, v_body, '/wallet', 'sparks-tx-' || NEW.id::text, false);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS push_on_sparks_transaction ON public.sparks_transactions;
CREATE TRIGGER push_on_sparks_transaction
AFTER INSERT ON public.sparks_transactions
FOR EACH ROW EXECUTE FUNCTION public.push_on_sparks_transaction();

-- Push: featured request approved/rejected
CREATE OR REPLACE FUNCTION public.push_on_featured_request_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_title text; v_body text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'approved' THEN
    v_title := 'Featured listing approved ⭐';
    v_body := 'Your profile is now featured';
  ELSIF NEW.status = 'rejected' THEN
    v_title := 'Featured request declined';
    v_body := 'Your featured request was declined';
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.invoke_send_push(NEW.user_id, v_title, v_body, '/worker-dashboard', 'featreq-' || NEW.id::text, false);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS push_on_featured_request_status ON public.featured_requests;
CREATE TRIGGER push_on_featured_request_status
AFTER UPDATE OF status ON public.featured_requests
FOR EACH ROW EXECUTE FUNCTION public.push_on_featured_request_status();

-- Push: worker verification status change
CREATE OR REPLACE FUNCTION public.push_on_worker_verification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.verified = OLD.verified THEN RETURN NEW; END IF;

  IF NEW.verified = true THEN
    PERFORM public.invoke_send_push(
      NEW.user_id,
      'Verification approved ✅',
      'You''re now a verified worker',
      '/worker-dashboard',
      'verif-' || NEW.id::text,
      false
    );
  ELSE
    PERFORM public.invoke_send_push(
      NEW.user_id,
      'Verification removed',
      'Your verified status has been removed',
      '/worker-dashboard',
      'verif-' || NEW.id::text,
      false
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS push_on_worker_verification ON public.workers;
CREATE TRIGGER push_on_worker_verification
AFTER UPDATE OF verified ON public.workers
FOR EACH ROW EXECUTE FUNCTION public.push_on_worker_verification();
