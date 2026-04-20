
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS face_verified,
  DROP COLUMN IF EXISTS face_verified_at,
  DROP COLUMN IF EXISTS face_token,
  DROP COLUMN IF EXISTS face_image_path,
  DROP COLUMN IF EXISTS face_descriptor;

DROP POLICY IF EXISTS "Users can upload their own face verification" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own face verification" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own face verification" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own face verification" ON storage.objects;
