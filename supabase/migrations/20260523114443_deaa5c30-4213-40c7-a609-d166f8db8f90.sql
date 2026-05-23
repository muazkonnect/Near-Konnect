
ALTER TABLE public.profile_phones
  ADD CONSTRAINT profile_phones_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.worker_private
  ADD CONSTRAINT worker_private_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
