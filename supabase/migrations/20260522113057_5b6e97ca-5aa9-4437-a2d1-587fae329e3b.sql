ALTER TABLE public.avatar_reset_requests REPLICA IDENTITY FULL;
ALTER TABLE public.worker_location_change_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.avatar_reset_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_location_change_requests;