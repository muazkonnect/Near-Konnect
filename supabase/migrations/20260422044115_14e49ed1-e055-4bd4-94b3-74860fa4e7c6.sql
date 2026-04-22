ALTER TABLE public.contact_reveals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_reveals;