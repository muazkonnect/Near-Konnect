
-- Add verification and featured request fields to workers table
ALTER TABLE public.workers 
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_requested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_requested boolean DEFAULT false;

-- Create notifications table if it doesn't exist to notify admins
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'verification_request', 'featured_request', etc.
  target_id TEXT, -- ID of the worker/request
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

-- Function to notify admins when a worker requests verification or featured status
CREATE OR REPLACE FUNCTION public.notify_admin_on_worker_request()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- Check if verification_requested or featured_requested changed to true
  IF (NEW.verification_requested IS TRUE AND OLD.verification_requested IS FALSE) OR
     (NEW.featured_requested IS TRUE AND OLD.featured_requested IS FALSE) THEN
    
    -- Loop through all admins and create notifications
    FOR admin_id IN (
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    ) LOOP
      INSERT INTO public.notifications (user_id, title, message, type, target_id)
      VALUES (
        admin_id,
        CASE 
          WHEN NEW.verification_requested IS TRUE AND OLD.verification_requested IS FALSE THEN 'New Verification Request'
          ELSE 'New Featured Request'
        END,
        'Worker ' || (SELECT full_name FROM public.profiles WHERE user_id = NEW.user_id) || ' has requested ' || 
        CASE 
          WHEN NEW.verification_requested IS TRUE AND OLD.verification_requested IS FALSE THEN 'verification.'
          ELSE 'featured status.'
        END,
        CASE 
          WHEN NEW.verification_requested IS TRUE AND OLD.verification_requested IS FALSE THEN 'verification_request'
          ELSE 'featured_request'
        END,
        NEW.id::TEXT
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for worker requests
DROP TRIGGER IF EXISTS tr_worker_request_notification ON public.workers;
CREATE TRIGGER tr_worker_request_notification
AFTER UPDATE ON public.workers
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_worker_request();
