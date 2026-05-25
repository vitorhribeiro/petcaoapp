ALTER TABLE public.services ADD COLUMN included_items text[] DEFAULT '{}'::text[];
