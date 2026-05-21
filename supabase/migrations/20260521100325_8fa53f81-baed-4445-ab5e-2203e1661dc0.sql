-- Remove duplicate sub-categories (same name appearing under multiple main categories).
-- Keep the copy with the most expertise rows; tie-break by earliest created_at.
WITH subs AS (
  SELECT sc.id, sc.name, sc.created_at,
         (SELECT count(*) FROM public.category_expertise e WHERE e.sub_category_id = sc.id) AS exp_cnt
  FROM public.service_categories sc
  WHERE sc.parent_id IS NOT NULL
),
ranked AS (
  SELECT id, name,
         row_number() OVER (PARTITION BY lower(name) ORDER BY exp_cnt DESC, created_at ASC, id ASC) AS rn
  FROM subs
)
DELETE FROM public.service_categories
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Add a unique constraint to prevent future duplicate sub-category names (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS service_categories_sub_name_unique
  ON public.service_categories (lower(name))
  WHERE parent_id IS NOT NULL;

-- Defensive: remove any duplicate expertise rows within a single sub-category (case-insensitive)
DELETE FROM public.category_expertise a
USING public.category_expertise b
WHERE a.sub_category_id = b.sub_category_id
  AND lower(a.name) = lower(b.name)
  AND a.ctid > b.ctid;

-- Prevent future duplicates of expertise within a sub-category
CREATE UNIQUE INDEX IF NOT EXISTS category_expertise_sub_name_unique
  ON public.category_expertise (sub_category_id, lower(name));