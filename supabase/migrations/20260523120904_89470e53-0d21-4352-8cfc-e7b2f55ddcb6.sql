
CREATE TABLE public.admin_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_otp_codes_user ON public.admin_otp_codes(user_id, created_at DESC);
ALTER TABLE public.admin_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text
);
CREATE INDEX idx_admin_sessions_user ON public.admin_sessions(user_id, expires_at DESC);
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Admins may read their own (non-expired) sessions; no client writes.
CREATE POLICY "admins read own sessions"
ON public.admin_sessions FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));
