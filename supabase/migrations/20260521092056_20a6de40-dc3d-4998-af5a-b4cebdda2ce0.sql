
-- 1. Extend service_categories
ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS service_categories_slug_idx
  ON public.service_categories(slug) WHERE slug IS NOT NULL;

-- 2. Expertise table
CREATE TABLE IF NOT EXISTS public.category_expertise (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sub_category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (sub_category_id, name)
);

CREATE INDEX IF NOT EXISTS idx_category_expertise_sub
  ON public.category_expertise(sub_category_id, sort_order);

ALTER TABLE public.category_expertise ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Expertise viewable by everyone" ON public.category_expertise;
CREATE POLICY "Expertise viewable by everyone"
  ON public.category_expertise FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage expertise" ON public.category_expertise;
CREATE POLICY "Admins manage expertise"
  ON public.category_expertise FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_category_expertise_updated_at
  BEFORE UPDATE ON public.category_expertise
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Seed function: accepts taxonomy JSON, wipes & repopulates
CREATE OR REPLACE FUNCTION public.seed_nearkonnect_taxonomy(payload JSONB)
RETURNS TABLE(mains_count INT, subs_count INT, expertise_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m JSONB;
  s JSONB;
  e TEXT;
  main_id UUID;
  sub_id UUID;
  exp_idx INT;
  mc INT := 0; sc INT := 0; ec INT := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  DELETE FROM public.category_expertise;
  DELETE FROM public.service_categories;

  -- Mains
  FOR m IN SELECT * FROM jsonb_array_elements(payload->'main') LOOP
    INSERT INTO public.service_categories (name, icon, sort_order, parent_id, is_active)
    VALUES (m->>'name', COALESCE(m->>'icon',''), (m->>'sort_order')::int, NULL, true);
    mc := mc + 1;
  END LOOP;

  -- Subs + expertise
  FOR s IN SELECT * FROM jsonb_array_elements(payload->'sub') LOOP
    SELECT id INTO main_id FROM public.service_categories
      WHERE name = s->>'main' AND parent_id IS NULL LIMIT 1;
    IF main_id IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.service_categories (name, icon, sort_order, parent_id, is_active)
    VALUES (s->>'name', COALESCE(s->>'icon',''), (s->>'sort_order')::int, main_id, true)
    RETURNING id INTO sub_id;
    sc := sc + 1;

    exp_idx := 0;
    FOR e IN SELECT jsonb_array_elements_text(s->'expertise') LOOP
      exp_idx := exp_idx + 1;
      INSERT INTO public.category_expertise (sub_category_id, name, sort_order)
      VALUES (sub_id, e, exp_idx)
      ON CONFLICT DO NOTHING;
      ec := ec + 1;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT mc, sc, ec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_nearkonnect_taxonomy(JSONB) TO authenticated;
