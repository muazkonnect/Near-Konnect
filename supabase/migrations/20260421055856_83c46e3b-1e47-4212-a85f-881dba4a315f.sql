-- Job Konnect: jobs and applications

CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poster_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  budget NUMERIC(10,2),
  city TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_poster ON public.jobs(poster_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_city ON public.jobs(city);
CREATE INDEX idx_jobs_category ON public.jobs(category);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view jobs"
ON public.jobs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create own jobs"
ON public.jobs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = poster_id);

CREATE POLICY "Posters can update own jobs"
ON public.jobs FOR UPDATE
TO authenticated
USING (auth.uid() = poster_id);

CREATE POLICY "Posters can delete own jobs"
ON public.jobs FOR DELETE
TO authenticated
USING (auth.uid() = poster_id);

CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Applications

CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, applicant_id)
);

CREATE INDEX idx_job_applications_job ON public.job_applications(job_id);
CREATE INDEX idx_job_applications_applicant ON public.job_applications(applicant_id);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants and posters can view applications"
ON public.job_applications FOR SELECT
TO authenticated
USING (
  applicant_id = auth.uid()
  OR auth.uid() = (SELECT poster_id FROM public.jobs WHERE id = job_id)
);

CREATE POLICY "Users can apply to jobs"
ON public.job_applications FOR INSERT
TO authenticated
WITH CHECK (
  applicant_id = auth.uid()
  AND auth.uid() <> (SELECT poster_id FROM public.jobs WHERE id = job_id)
);

CREATE POLICY "Posters can update application status"
ON public.job_applications FOR UPDATE
TO authenticated
USING (auth.uid() = (SELECT poster_id FROM public.jobs WHERE id = job_id));

CREATE POLICY "Applicants can withdraw"
ON public.job_applications FOR DELETE
TO authenticated
USING (applicant_id = auth.uid());

CREATE TRIGGER update_job_applications_updated_at
BEFORE UPDATE ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();