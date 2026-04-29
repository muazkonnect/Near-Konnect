ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_service_categories_sort_order ON public.service_categories(sort_order);

-- Initialize sort_order based on current name order for existing rows
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY COALESCE(parent_id::text, 'root') ORDER BY name) * 10 AS rn
  FROM public.service_categories
  WHERE sort_order = 0
)
UPDATE public.service_categories sc
SET sort_order = ordered.rn
FROM ordered
WHERE sc.id = ordered.id;