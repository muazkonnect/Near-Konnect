ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS blood_show_contact boolean NOT NULL DEFAULT true;