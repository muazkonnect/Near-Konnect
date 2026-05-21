
CREATE OR REPLACE FUNCTION public.seed_nearkonnect_taxonomy(payload JSONB)
RETURNS TABLE(mains_count INT, subs_count INT, expertise_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m JSONB; s JSONB; e TEXT;
  main_id UUID; sub_id UUID; exp_idx INT;
  mc INT := 0; sc INT := 0; ec INT := 0;
BEGIN
  DELETE FROM public.category_expertise;
  DELETE FROM public.service_categories;
  FOR m IN SELECT * FROM jsonb_array_elements(payload->'main') LOOP
    INSERT INTO public.service_categories (name, icon, sort_order, parent_id, is_active)
    VALUES (m->>'name', COALESCE(m->>'icon',''), (m->>'sort_order')::int, NULL, true);
    mc := mc + 1;
  END LOOP;
  FOR s IN SELECT * FROM jsonb_array_elements(payload->'sub') LOOP
    SELECT id INTO main_id FROM public.service_categories WHERE name = s->>'main' AND parent_id IS NULL LIMIT 1;
    IF main_id IS NULL THEN CONTINUE; END IF;
    INSERT INTO public.service_categories (name, icon, sort_order, parent_id, is_active)
    VALUES (s->>'name', COALESCE(s->>'icon',''), (s->>'sort_order')::int, main_id, true)
    RETURNING id INTO sub_id;
    sc := sc + 1;
    exp_idx := 0;
    FOR e IN SELECT jsonb_array_elements_text(s->'expertise') LOOP
      exp_idx := exp_idx + 1;
      INSERT INTO public.category_expertise (sub_category_id, name, sort_order)
      VALUES (sub_id, e, exp_idx) ON CONFLICT DO NOTHING;
      ec := ec + 1;
    END LOOP;
  END LOOP;
  RETURN QUERY SELECT mc, sc, ec;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.seed_nearkonnect_taxonomy(JSONB) FROM PUBLIC, anon, authenticated;
