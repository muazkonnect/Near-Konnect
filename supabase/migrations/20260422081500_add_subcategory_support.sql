-- Add parent_id to service_categories to support subcategories
-- If you see an error about "column parent not found", it means this migration was not applied yet.
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.service_categories(id) ON DELETE CASCADE;

-- Update unique constraint to allow same name under different parents, 
-- but keep it unique within the same level.
-- In Postgres, (name, parent_id) UNIQUE allows multiple NULL parent_ids with same name.
-- To fix this for main categories, we can use a partial index or just assume names are unique enough.
ALTER TABLE public.service_categories DROP CONSTRAINT IF EXISTS service_categories_name_key;
CREATE UNIQUE INDEX service_categories_name_parent_idx ON public.service_categories (name, (parent_id IS NULL)) WHERE parent_id IS NULL;
CREATE UNIQUE INDEX service_categories_name_sub_idx ON public.service_categories (name, parent_id) WHERE parent_id IS NOT NULL;
