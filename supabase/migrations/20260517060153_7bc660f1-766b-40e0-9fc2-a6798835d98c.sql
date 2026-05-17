ALTER TABLE public.workers
  ADD CONSTRAINT workers_uid_format_chk
  CHECK (uid IS NULL OR uid ~ '^NK-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$');