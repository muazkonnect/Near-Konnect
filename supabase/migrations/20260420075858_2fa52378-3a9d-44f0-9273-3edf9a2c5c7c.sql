-- Add face verification columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS face_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS face_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS face_token text,
  ADD COLUMN IF NOT EXISTS face_image_path text;

-- Private storage bucket for face verification images
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-verifications', 'face-verifications', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects for the bucket
DROP POLICY IF EXISTS "Users upload own face image" ON storage.objects;
CREATE POLICY "Users upload own face image"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'face-verifications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users read own face image" ON storage.objects;
CREATE POLICY "Users read own face image"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'face-verifications'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role('admin'::app_role, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users update own face image" ON storage.objects;
CREATE POLICY "Users update own face image"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'face-verifications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users delete own face image" ON storage.objects;
CREATE POLICY "Users delete own face image"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'face-verifications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);