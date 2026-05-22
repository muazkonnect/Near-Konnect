ALTER TABLE public.featured_workers REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='featured_workers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.featured_workers;
  END IF;
END$$;