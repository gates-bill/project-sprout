create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if pg_catalog.to_regprocedure(
    'extensions.gen_random_bytes(integer)'
  ) is null or pg_catalog.to_regprocedure(
    'extensions.digest(text,text)'
  ) is null then
    raise exception using
      message = 'PGCRYPTO_EXTENSION_SCHEMA_REQUIRES_INSPECTION',
      detail = 'Project Sprout expects Supabase pgcrypto functions in the extensions schema. Do not move an existing extension until dependent functions have been inspected.';
  end if;
end;
$$;

create table if not exists public.care_circles (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.care_circles
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.care_circle_members (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  care_circle_id uuid not null references public.care_circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'caregiver')),
  created_at timestamptz not null default now(),
  unique (care_circle_id, user_id),
  unique (user_id)
);

alter table public.care_circle_members
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists care_circle_one_owner_idx
on public.care_circle_members (care_circle_id)
where role = 'owner';

create unique index if not exists care_circle_members_circle_user_uidx
on public.care_circle_members (care_circle_id, user_id);

create unique index if not exists care_circle_members_one_circle_per_user_uidx
on public.care_circle_members (user_id);

create index if not exists care_circle_members_user_idx
on public.care_circle_members (user_id);

create table if not exists public.care_circle_invites (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  care_circle_id uuid not null references public.care_circles(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

alter table public.care_circle_invites
  add column if not exists token_hash text,
  add column if not exists created_by uuid references auth.users(id) on delete cascade,
  add column if not exists expires_at timestamptz,
  add column if not exists used_at timestamptz,
  add column if not exists used_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from public.care_circle_invites
    where token_hash is null
       or created_by is null
       or expires_at is null
  ) then
    raise exception using
      message = 'LEGACY_INVITES_REQUIRE_INSPECTION',
      detail = 'Existing invite rows cannot be safely converted without inspecting their legacy code, creator, and expiration columns.';
  end if;
end;
$$;

alter table public.care_circle_invites
  alter column token_hash set not null,
  alter column created_by set not null,
  alter column expires_at set not null;

create unique index if not exists care_circle_invites_token_hash_idx
on public.care_circle_invites (token_hash);

create index if not exists care_circle_invites_circle_idx
on public.care_circle_invites (care_circle_id);

create index if not exists care_circle_invites_expiry_idx
on public.care_circle_invites (expires_at)
where used_at is null;

create table if not exists public.babies (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  care_circle_id uuid not null unique references public.care_circles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  birth_date date not null,
  photo_path text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.babies
  add column if not exists photo_path text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists babies_one_per_care_circle_uidx
on public.babies (care_circle_id);

create table if not exists public.activities (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  baby_id uuid not null references public.babies(id) on delete cascade,
  client_id text not null,
  created_by uuid references auth.users(id) on delete set null,
  type text not null check (type in ('feeding', 'diaper', 'sleep', 'note')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1 check (revision > 0),
  note text,
  feeding_method text check (feeding_method is null or feeding_method in ('Breast', 'Bottle', 'Solids')),
  amount_oz numeric check (amount_oz is null or amount_oz > 0),
  diaper_type text check (diaper_type is null or diaper_type in ('Wet', 'Dirty', 'Both', 'Dry')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  unique (baby_id, client_id)
);

alter table public.activities
  add column if not exists client_id text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists revision integer not null default 1,
  add column if not exists note text,
  add column if not exists feeding_method text,
  add column if not exists amount_oz numeric,
  add column if not exists diaper_type text,
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists duration_minutes integer;

update public.activities
set client_id = id::text
where client_id is null;

alter table public.activities
alter column client_id set not null;

create unique index if not exists activities_baby_client_idx
on public.activities (baby_id, client_id);

create index if not exists activities_baby_occurred_idx
on public.activities (baby_id, occurred_at desc);

create table if not exists public.active_sleep_sessions (
  baby_id uuid primary key references public.babies(id) on delete cascade,
  session_id text not null unique,
  started_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.active_sleep_sessions
  add column if not exists session_id text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.active_sleep_sessions
set session_id = pg_catalog.gen_random_uuid()::text
where session_id is null;

alter table public.active_sleep_sessions
alter column session_id set not null;

create unique index if not exists active_sleep_session_id_idx
on public.active_sleep_sessions (session_id);

create unique index if not exists active_sleep_one_per_baby_uidx
on public.active_sleep_sessions (baby_id);

create table if not exists public.sleep_completion_operations (
  operation_id text primary key,
  baby_id uuid not null references public.babies(id) on delete cascade,
  session_id text not null,
  activity_client_id text not null,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz not null default now(),
  unique (baby_id, session_id),
  unique (baby_id, activity_client_id)
);

alter table public.sleep_completion_operations
  add column if not exists operation_id text,
  add column if not exists baby_id uuid,
  add column if not exists session_id text,
  add column if not exists activity_client_id text,
  add column if not exists completed_by uuid references auth.users(id) on delete set null,
  add column if not exists completed_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from public.sleep_completion_operations
    where operation_id is null
       or baby_id is null
       or session_id is null
       or activity_client_id is null
  ) then
    raise exception 'INCOMPLETE_SLEEP_COMPLETION_OPERATIONS_REQUIRE_INSPECTION';
  end if;
end;
$$;

alter table public.sleep_completion_operations
  alter column operation_id set not null,
  alter column baby_id set not null,
  alter column session_id set not null,
  alter column activity_client_id set not null;

create unique index if not exists sleep_completion_operation_uidx
on public.sleep_completion_operations (operation_id);

create unique index if not exists sleep_completion_baby_session_uidx
on public.sleep_completion_operations (baby_id, session_id);

create unique index if not exists sleep_completion_baby_activity_uidx
on public.sleep_completion_operations (baby_id, activity_client_id);

do $$
declare
  expected record;
begin
  for expected in
    select * from (values
      ('care_circles', 'id'),
      ('care_circles', 'name'),
      ('care_circle_members', 'id'),
      ('care_circle_members', 'care_circle_id'),
      ('care_circle_members', 'user_id'),
      ('care_circle_members', 'role'),
      ('care_circle_invites', 'id'),
      ('care_circle_invites', 'care_circle_id'),
      ('babies', 'id'),
      ('babies', 'care_circle_id'),
      ('babies', 'name'),
      ('babies', 'birth_date'),
      ('activities', 'id'),
      ('activities', 'baby_id'),
      ('activities', 'type'),
      ('activities', 'occurred_at'),
      ('active_sleep_sessions', 'baby_id'),
      ('active_sleep_sessions', 'started_at')
    ) as required_column(table_name, column_name)
  loop
    if not exists (
      select 1
      from information_schema.columns column_info
      where column_info.table_schema = 'public'
        and column_info.table_name = expected.table_name
        and column_info.column_name = expected.column_name
    ) then
      raise exception 'REQUIRED_COLUMN_MISSING: public.%.%',
        expected.table_name,
        expected.column_name;
    end if;
  end loop;
end;
$$;

create or replace function public.is_care_circle_member(circle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.care_circle_members member
    where member.care_circle_id = circle_id
      and member.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_care_circle_owner(circle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.care_circle_members member
    where member.care_circle_id = circle_id
      and member.user_id = (select auth.uid())
      and member.role = 'owner'
  );
$$;

revoke all on function public.is_care_circle_member(uuid) from public;
revoke all on function public.is_care_circle_owner(uuid) from public;
grant execute on function public.is_care_circle_member(uuid) to authenticated;
grant execute on function public.is_care_circle_owner(uuid) to authenticated;

alter table public.care_circles enable row level security;
alter table public.care_circle_members enable row level security;
alter table public.care_circle_invites enable row level security;
alter table public.babies enable row level security;
alter table public.activities enable row level security;
alter table public.active_sleep_sessions enable row level security;
alter table public.sleep_completion_operations enable row level security;

drop policy if exists "Members can read their Care Circle" on public.care_circles;
create policy "Members can read their Care Circle"
on public.care_circles for select to authenticated
using (public.is_care_circle_member(id));

drop policy if exists "Members can read memberships" on public.care_circle_members;
create policy "Members can read memberships"
on public.care_circle_members for select to authenticated
using (public.is_care_circle_member(care_circle_id));

drop policy if exists "Owners can read invites" on public.care_circle_invites;
create policy "Owners can read invites"
on public.care_circle_invites for select to authenticated
using (public.is_care_circle_owner(care_circle_id));

drop policy if exists "Members can read babies" on public.babies;
create policy "Members can read babies"
on public.babies for select to authenticated
using (public.is_care_circle_member(care_circle_id));

drop policy if exists "Owners can create babies" on public.babies;
create policy "Owners can create babies"
on public.babies for insert to authenticated
with check (public.is_care_circle_owner(care_circle_id));

drop policy if exists "Care Circle members can update babies" on public.babies;
create policy "Care Circle members can update babies"
on public.babies for update to authenticated
using (public.is_care_circle_member(care_circle_id))
with check (public.is_care_circle_member(care_circle_id));

drop policy if exists "Members can read activities" on public.activities;
create policy "Members can read activities"
on public.activities for select to authenticated
using (
  exists (
    select 1 from public.babies baby
    where baby.id = activities.baby_id
      and public.is_care_circle_member(baby.care_circle_id)
  )
);

drop policy if exists "Members can write activities" on public.activities;
create policy "Members can write activities"
on public.activities for all to authenticated
using (
  exists (
    select 1 from public.babies baby
    where baby.id = activities.baby_id
      and public.is_care_circle_member(baby.care_circle_id)
  )
)
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.babies baby
    where baby.id = activities.baby_id
      and public.is_care_circle_member(baby.care_circle_id)
  )
);

drop policy if exists "Members can read active sleep" on public.active_sleep_sessions;
create policy "Members can read active sleep"
on public.active_sleep_sessions for select to authenticated
using (
  exists (
    select 1 from public.babies baby
    where baby.id = active_sleep_sessions.baby_id
      and public.is_care_circle_member(baby.care_circle_id)
  )
);

drop policy if exists "Members can write active sleep" on public.active_sleep_sessions;
create policy "Members can write active sleep"
on public.active_sleep_sessions for all to authenticated
using (
  exists (
    select 1 from public.babies baby
    where baby.id = active_sleep_sessions.baby_id
      and public.is_care_circle_member(baby.care_circle_id)
  )
)
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.babies baby
    where baby.id = active_sleep_sessions.baby_id
      and public.is_care_circle_member(baby.care_circle_id)
  )
);

create or replace function public.create_care_circle(circle_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  new_circle_id uuid;
begin
  if caller_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from public.care_circle_members where user_id = caller_id) then
    raise exception 'ALREADY_IN_CARE_CIRCLE';
  end if;
  if char_length(trim(circle_name)) not between 1 and 80 then
    raise exception 'INVALID_CIRCLE_NAME';
  end if;

  insert into public.care_circles (name, created_by)
  values (trim(circle_name), caller_id)
  returning id into new_circle_id;

  insert into public.care_circle_members (care_circle_id, user_id, role)
  values (new_circle_id, caller_id, 'owner');

  return new_circle_id;
end;
$$;

drop function if exists public.create_care_circle_invite(uuid);

create or replace function public.create_care_circle_invite(circle_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  invite_token text;
begin
  if caller_id is null or not public.is_care_circle_owner(circle_id) then
    raise exception 'OWNER_REQUIRED';
  end if;

  delete from public.care_circle_invites
  where care_circle_id = circle_id
    and (used_at is not null or expires_at <= now());

  invite_token := pg_catalog.translate(
    pg_catalog.encode(extensions.gen_random_bytes(18), 'base64'),
    '+/=',
    '-_'
  );

  insert into public.care_circle_invites (
    care_circle_id, token_hash, created_by, expires_at
  ) values (
    circle_id,
    pg_catalog.encode(
      extensions.digest(invite_token, 'sha256'),
      'hex'
    ),
    caller_id,
    now() + interval '24 hours'
  );

  return invite_token;
end;
$$;

drop function if exists public.accept_care_circle_invite(uuid);

create or replace function public.accept_care_circle_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  matched_invite public.care_circle_invites%rowtype;
begin
  if caller_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from public.care_circle_members where user_id = caller_id) then
    raise exception 'ALREADY_IN_CARE_CIRCLE';
  end if;

  select * into matched_invite
  from public.care_circle_invites
  where token_hash = pg_catalog.encode(
      extensions.digest(pg_catalog.btrim(invite_code), 'sha256'),
      'hex'
    )
    and used_at is null
    and expires_at > now()
  for update;

  if not found then raise exception 'INVITE_INVALID_OR_EXPIRED'; end if;

  insert into public.care_circle_members (care_circle_id, user_id, role)
  values (matched_invite.care_circle_id, caller_id, 'caregiver');

  update public.care_circle_invites
  set used_at = now(), used_by = caller_id
  where id = matched_invite.id;

  return matched_invite.care_circle_id;
end;
$$;

create or replace function public.get_care_circle_members(circle_id uuid)
returns table (
  member_id uuid,
  user_id uuid,
  role text,
  email text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select member.id, member.user_id, member.role, account.email::text, member.created_at
  from public.care_circle_members member
  join auth.users account on account.id = member.user_id
  where member.care_circle_id = circle_id
    and public.is_care_circle_member(circle_id)
  order by case when member.role = 'owner' then 0 else 1 end, member.created_at;
$$;

create or replace function public.remove_care_circle_member(
  circle_id uuid,
  member_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_care_circle_owner(circle_id) then raise exception 'OWNER_REQUIRED'; end if;
  if exists (
    select 1 from public.care_circle_members
    where care_circle_id = circle_id and user_id = member_user_id and role = 'owner'
  ) then raise exception 'CANNOT_REMOVE_OWNER'; end if;

  delete from public.care_circle_members
  where care_circle_id = circle_id and user_id = member_user_id and role = 'caregiver';
end;
$$;

create or replace function public.transfer_care_circle_ownership(
  circle_id uuid,
  new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare caller_id uuid := auth.uid();
begin
  if not public.is_care_circle_owner(circle_id) then raise exception 'OWNER_REQUIRED'; end if;
  perform 1 from public.care_circles
  where id = circle_id for update;
  if not exists (
    select 1 from public.care_circle_members
    where care_circle_id = circle_id and user_id = new_owner_user_id and role = 'caregiver'
  ) then raise exception 'CAREGIVER_NOT_FOUND'; end if;

  update public.care_circle_members set role = 'caregiver'
  where care_circle_id = circle_id and user_id = caller_id;
  update public.care_circle_members set role = 'owner'
  where care_circle_id = circle_id and user_id = new_owner_user_id;
end;
$$;

revoke all on function public.create_care_circle(text) from public, anon;
revoke all on function public.create_care_circle_invite(uuid) from public, anon;
revoke all on function public.accept_care_circle_invite(text) from public, anon;
revoke all on function public.get_care_circle_members(uuid) from public, anon;
revoke all on function public.remove_care_circle_member(uuid, uuid) from public, anon;
revoke all on function public.transfer_care_circle_ownership(uuid, uuid) from public, anon;
grant execute on function public.create_care_circle(text) to authenticated;
grant execute on function public.create_care_circle_invite(uuid) to authenticated;
grant execute on function public.accept_care_circle_invite(text) to authenticated;
grant execute on function public.get_care_circle_members(uuid) to authenticated;
grant execute on function public.remove_care_circle_member(uuid, uuid) to authenticated;
grant execute on function public.transfer_care_circle_ownership(uuid, uuid) to authenticated;
