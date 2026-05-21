
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text NOT NULL DEFAULT '',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Anyone can read app settings" ON public.app_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage app settings" ON public.app_settings;
CREATE POLICY "Admins manage app settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (has_role('admin'::app_role, auth.uid()))
  WITH CHECK (has_role('admin'::app_role, auth.uid()));

INSERT INTO public.app_settings (key, value, description) VALUES
  ('homepage_promoted_radii_km', '[5,10,15]'::jsonb, 'Radius buckets used for homepage promoted-ads sections (km).'),
  ('explore_default_radius_km', '10'::jsonb, 'Default radius for Explore promoted ads when no category is selected (km).'),
  ('discover_default_radius_km', '3'::jsonb, 'Initial radius selected on the Discover page (km).'),
  ('blood_donors_radius_km', '25'::jsonb, 'Radius for nearby blood donors/requests (km).'),
  ('workers_default_radius_km', '10'::jsonb, 'Default radius for worker discovery (km).')
ON CONFLICT (key) DO NOTHING;
