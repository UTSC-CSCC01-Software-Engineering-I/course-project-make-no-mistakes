-- Profile table that extends Supabase's built-in auth.users with app-specific fields.
-- auth.users already provides id (uuid), email, and created_at, so this table
-- is keyed 1:1 on auth.users(id) rather than duplicating those columns.

create type public.user_role as enum ('publicuser', 'commissioner');

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	role public.user_role not null default 'publicuser',
	display_name text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- keep updated_at current on every change
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- role can only change through admin_set_role below; fires regardless of
-- who issues the update (RLS policies alone wouldn't stop a service-role call)
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
	if new.role is distinct from old.role
	   and coalesce(current_setting('app.role_change_authorized', true), '') <> 'on' then
		raise exception 'role can only be changed via admin_set_role';
	end if;
	return new;
end;
$$;

create trigger lock_profiles_role
before update on public.profiles
for each row execute function public.prevent_role_change();

-- the ONE sanctioned way to assign a role. Only the service role may execute
-- it (revoked from everyone else below); the authorization flag is
-- transaction-local, so it resets automatically and nothing outside this
-- function can set it to slip a role update past the lock trigger.
create or replace function public.admin_set_role(target_user uuid, new_role public.user_role)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
	perform set_config('app.role_change_authorized', 'on', true);
	update public.profiles set role = new_role where id = target_user;
	if not found then
		raise exception 'no profile found for user %', target_user;
	end if;
end;
$$;

revoke execute on function public.admin_set_role from public, anon, authenticated;

-- auto-create a profile row whenever a new user signs up via Supabase Auth.
-- everyone starts as 'publicuser'; commissioners are promoted via
-- admin_set_role immediately after creation (see scripts/createCommissioner.js)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
	insert into public.profiles (id)
	values (new.id);
	return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
on public.profiles for select
to authenticated
using (true);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

