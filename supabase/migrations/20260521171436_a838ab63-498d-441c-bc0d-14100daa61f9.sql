-- 1. Add banner_url to workers
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 2. Portfolio table
CREATE TABLE IF NOT EXISTS public.worker_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_portfolio_worker ON public.worker_portfolio(worker_id, sort_order);

ALTER TABLE public.worker_portfolio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Portfolio viewable by everyone" ON public.worker_portfolio;
CREATE POLICY "Portfolio viewable by everyone" ON public.worker_portfolio
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Workers can insert own portfolio" ON public.worker_portfolio;
CREATE POLICY "Workers can insert own portfolio" ON public.worker_portfolio
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Workers can update own portfolio" ON public.worker_portfolio;
CREATE POLICY "Workers can update own portfolio" ON public.worker_portfolio
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Workers can delete own portfolio" ON public.worker_portfolio;
CREATE POLICY "Workers can delete own portfolio" ON public.worker_portfolio
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage portfolio" ON public.worker_portfolio;
CREATE POLICY "Admins manage portfolio" ON public.worker_portfolio
  FOR ALL USING (has_role('admin'::app_role, auth.uid()))
  WITH CHECK (has_role('admin'::app_role, auth.uid()));

-- 3. Storage bucket for banners and portfolio
INSERT INTO storage.buckets (id, name, public)
VALUES ('worker-media', 'worker-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users manage their own folder, public read
DROP POLICY IF EXISTS "worker-media public read" ON storage.objects;
CREATE POLICY "worker-media public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'worker-media');

DROP POLICY IF EXISTS "worker-media owner insert" ON storage.objects;
CREATE POLICY "worker-media owner insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'worker-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "worker-media owner update" ON storage.objects;
CREATE POLICY "worker-media owner update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'worker-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "worker-media owner delete" ON storage.objects;
CREATE POLICY "worker-media owner delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'worker-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );