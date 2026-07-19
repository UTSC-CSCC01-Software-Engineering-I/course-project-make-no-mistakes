-- CRMP: shared submissions table
-- Covers all three public submission types from the spec (comment, objection,
-- counter_proposal) in one table so future submission types don't require a
-- schema fork.
--
-- AI-assisted code (claude)

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists postgis;    -- optional geometry escape hatch, see note below

do $$ begin
  create type submission_type as enum ('comment', 'objection', 'counter_proposal');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type submission_status as enum ('received', 'under_review', 'addressed');
exception
  when duplicate_object then null;
end $$;

create table if not exists submissions (
  id                       uuid primary key default gen_random_uuid(),
  public_reference_number text not null unique
                           default ('CRMP-' || upper(substr(gen_random_uuid()::text, 1, 8))),

  user_id                  uuid not null references auth.users(id) on delete cascade,

  -- proposals are currently static JSON on the client, not a DB table, so this
  -- is a plain integer rather than a foreign key. Add the FK once proposals
  -- move into Supabase.
  proposal_id              integer not null,

  submission_type          submission_type not null default 'comment',

  -- riding IDs the submission is scoped to. Populated for comments today;
  -- required for objections/counter-proposals later.
  related_ridings          integer[] not null default '{}',

  -- Preferred way to represent spatial specificity: reference existing
  -- census-subdivision / polling-division block IDs rather than storing raw
  -- shapes. For a counter-proposal this can hold a block-id -> riding-id
  -- reassignment map; for an objection, the single block/edge being disputed.
  -- Keeping this as data you already have elsewhere means population-deviation
  -- math is a SUM() against existing demographic tables, not a spatial join.
  target_block_ids         jsonb,

  -- Escape hatch only: an ad hoc shape that isn't reducible to existing
  -- census-subdivision blocks. Expected to stay null for the vast majority
  -- of rows. Requires the postgis extension enabled above.
  geometry                 geometry(Geometry, 4326),

  body                     text not null,
  status                   submission_status not null default 'received',
  likes                    integer not null default 0,
  created_at               timestamptz not null default now()
);

create index if not exists submissions_proposal_id_idx on submissions (proposal_id);
create index if not exists submissions_user_id_idx on submissions (user_id);
create index if not exists submissions_type_idx on submissions (submission_type);

-- Append-only likes counter, race-safe under concurrent requests.
create or replace function increment_submission_likes(submission_id uuid)
returns setof submissions as $$
  update submissions
  set likes = likes + 1
  where id = submission_id
  returning *;
$$ language sql volatile;

alter table submissions enable row level security;

-- Public read access: browsing comments requires no account (per spec section 4).
-- NOTE: this exposes postUser/display-name-equivalent (user_id) and body to
-- anyone. Commissioner-only fields (tags, internal notes) live in a separate
-- table you'll add later and must NOT be exposed by this policy.
drop policy if exists "Public can read submissions" on submissions;
create policy "Public can read submissions"
  on submissions for select
  using (true);

-- Only an authenticated user can create a submission, and only as themselves.
drop policy if exists "Users can insert their own submissions" on submissions;
create policy "Users can insert their own submissions"
  on submissions for insert
  to authenticated
  with check (auth.uid() = user_id);

-- No update/delete policy is defined on purpose: submissions are append-only,
-- consistent with the spec's audit-log requirement (section 6). Corrections
-- should be modeled as a new row or a commissioner-side status change once
-- that table exists, not a mutation of the original submission.
