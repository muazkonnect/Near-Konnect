
ALTER TABLE public.profile_contact_methods
  ADD CONSTRAINT profile_contact_methods_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profile_contact_methods
  ADD CONSTRAINT profile_contact_methods_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
