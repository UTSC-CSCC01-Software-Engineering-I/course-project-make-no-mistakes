-- CRMP: commissioner-only notes + tags for counter-proposals.
--
-- AI-assisted code (claude)

create extension if not exists pgcrypto;   -- gen_random_uuid()

do $$ begin
  create type submission_tag as enum (
    'support', 'oppose', 'integrate', 'out_of_scope', 'correction'
  );
exception
  when duplicate_object then null;
end $$;

-- Append-only log of commissioner notes; many rows per submission. Never
-- edited or deleted in place — a correction is a new note, keeping the audit
-- trail intact (mirrors the append-only stance of submissions itself).
create table if not exists submission_notes (
  id              uuid primary key default gen_random_uuid(),
  submission_id   uuid not null references submissions(id) on delete cascade,
  commissioner_id uuid not null references auth.users(id),
  note            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists submission_notes_submission_id_idx
  on submission_notes (submission_id);

-- One row per submission holding the commissioner-assigned tag set. Written via
-- upsert on the submission_id primary key. updated_by / updated_at record who
-- last changed the set and when (the set itself is not audited per-tag; switch
-- to a join table if that's ever required).
create table if not exists submission_tags (
  submission_id  uuid primary key references submissions(id) on delete cascade,
  tags           submission_tag[] not null default '{}',
  updated_by     uuid references auth.users(id),
  updated_at     timestamptz not null default now()
);

-- GIN index so tag-membership filtering (@>, &&, = any) stays fast.
create index if not exists submission_tags_tags_idx
  on submission_tags using gin (tags);

alter table submission_notes enable row level security;
alter table submission_tags  enable row level security;
