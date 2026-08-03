create extension if not exists pgcrypto;

create extension if not exists postgis;

create type public.submission_type as enum ('comment', 'objection', 'counter_proposal');

create type public.submission_status as enum ('received', 'under_review', 'addressed');

create table public.submissions (
  id uuid not null default gen_random_uuid (),
  public_reference_number text not null default (
    'CRMP-'::text || upper(substr((gen_random_uuid ())::text, 1, 8))
  ),
  user_id uuid not null,
  proposal_id integer null,
  submission_type public.submission_type not null default 'comment'::submission_type,
  related_ridings integer[] not null default '{}'::integer[],
  target_block_ids jsonb null,
  map_data jsonb null,
  geometry geometry null,
  body text not null,
  status public.submission_status not null default 'received'::submission_status,
  likes integer not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint submissions_pkey primary key (id),
  constraint submissions_public_reference_number_key unique (public_reference_number),
  constraint submissions_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

alter table public.submissions enable row level security;

create index IF not exists submissions_proposal_id_idx on public.submissions using btree (proposal_id) TABLESPACE pg_default;

create index IF not exists submissions_user_id_idx on public.submissions using btree (user_id) TABLESPACE pg_default;

create index IF not exists submissions_type_idx on public.submissions using btree (submission_type) TABLESPACE pg_default;
