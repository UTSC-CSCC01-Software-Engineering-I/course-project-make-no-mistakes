create type public.user_role as enum ('publicuser', 'commissioner');

create table public.profiles (
  id uuid not null,
  role public.user_role not null default 'publicuser'::user_role,
  display_name text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

alter table public.profiles enable row level security;

create function public.prevent_role_change()
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

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.admin_set_role(target_user uuid, new_role public.user_role)
returns void
language plpgsql
as $$
begin
  perform set_config('app.role_change_authorized', 'on', true);
  update public.profiles set role = new_role where id = target_user;
  if not found then
    raise exception 'no profile found for user %', target_user;
  end if;
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger lock_profiles_role BEFORE
update on profiles for EACH row
execute FUNCTION prevent_role_change ();

create trigger set_profiles_updated_at BEFORE
update on profiles for EACH row
execute FUNCTION set_updated_at ();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
