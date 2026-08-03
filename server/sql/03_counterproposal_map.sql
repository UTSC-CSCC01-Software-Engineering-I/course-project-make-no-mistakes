alter table public.submissions
add column if not exists map_data jsonb;
