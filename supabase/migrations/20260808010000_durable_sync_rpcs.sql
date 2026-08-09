create table if not exists public.activity_mutation_operations (
  operation_id text primary key,
  baby_id uuid not null references public.babies(id) on delete cascade,
  activity_client_id text not null,
  mutation_kind text not null check (mutation_kind in ('upsert', 'delete')),
  result_revision integer,
  applied_by uuid references auth.users(id) on delete set null,
  applied_at timestamptz not null default now()
);

alter table public.activity_mutation_operations
  add column if not exists operation_id text,
  add column if not exists baby_id uuid,
  add column if not exists activity_client_id text,
  add column if not exists mutation_kind text,
  add column if not exists result_revision integer,
  add column if not exists applied_by uuid references auth.users(id) on delete set null,
  add column if not exists applied_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from public.activity_mutation_operations
    where operation_id is null
       or baby_id is null
       or activity_client_id is null
       or mutation_kind is null
  ) then
    raise exception 'INCOMPLETE_ACTIVITY_MUTATION_OPERATIONS_REQUIRE_INSPECTION';
  end if;
end;
$$;

alter table public.activity_mutation_operations
  alter column operation_id set not null,
  alter column baby_id set not null,
  alter column activity_client_id set not null,
  alter column mutation_kind set not null;

create unique index if not exists activity_mutation_operation_uidx
on public.activity_mutation_operations (operation_id);

create index if not exists activity_mutation_operations_baby_idx
on public.activity_mutation_operations (baby_id, applied_at desc);

alter table public.activity_mutation_operations enable row level security;

create or replace function public.can_access_baby(target_baby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.babies baby
    join public.care_circle_members member
      on member.care_circle_id = baby.care_circle_id
    where baby.id = target_baby_id
      and member.user_id = (select auth.uid())
  );
$$;

revoke all on function public.can_access_baby(uuid) from public;
grant execute on function public.can_access_baby(uuid) to authenticated;

create or replace function public.apply_activity_mutation(
  target_baby_id uuid,
  p_operation_id text,
  p_mutation_kind text,
  p_activity_client_id text,
  p_expected_revision integer,
  p_activity_data jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  existing_operation public.activity_mutation_operations%rowtype;
  existing_activity public.activities%rowtype;
  next_revision integer;
begin
  if caller_id is null or not public.can_access_baby(target_baby_id) then
    raise exception 'BABY_ACCESS_REQUIRED';
  end if;
  if p_mutation_kind not in ('upsert', 'delete') then raise exception 'INVALID_MUTATION'; end if;
  if p_operation_id is null or p_activity_client_id is null then raise exception 'INVALID_MUTATION'; end if;

  select * into existing_operation
  from public.activity_mutation_operations operation
  where operation.operation_id = p_operation_id;

  if found then
    return jsonb_build_object(
      'status', 'applied',
      'revision', existing_operation.result_revision
    );
  end if;

  select * into existing_activity
  from public.activities activity
  where activity.baby_id = target_baby_id
    and activity.client_id = p_activity_client_id
  for update;

  if p_mutation_kind = 'delete' then
    if found and coalesce(p_expected_revision, 0) <> existing_activity.revision then
      return jsonb_build_object(
        'status', 'conflict',
        'revision', existing_activity.revision
      );
    end if;

    if found then
      delete from public.activities where id = existing_activity.id;
    end if;

    insert into public.activity_mutation_operations (
      operation_id, baby_id, activity_client_id, mutation_kind,
      result_revision, applied_by
    ) values (
      p_operation_id, target_baby_id, p_activity_client_id, p_mutation_kind,
      coalesce(existing_activity.revision, p_expected_revision, 0), caller_id
    );

    return jsonb_build_object('status', 'applied', 'revision', null);
  end if;

  if p_activity_data is null then raise exception 'ACTIVITY_DATA_REQUIRED'; end if;

  if found then
    if coalesce(p_expected_revision, 0) <> existing_activity.revision then
      return jsonb_build_object(
        'status', 'conflict',
        'revision', existing_activity.revision
      );
    end if;

    next_revision := existing_activity.revision + 1;

    update public.activities set
      type = p_activity_data->>'type',
      occurred_at = (p_activity_data->>'occurred_at')::timestamptz,
      note = p_activity_data->>'note',
      feeding_method = p_activity_data->>'feeding_method',
      amount_oz = (p_activity_data->>'amount_oz')::numeric,
      diaper_type = p_activity_data->>'diaper_type',
      started_at = (p_activity_data->>'started_at')::timestamptz,
      ended_at = (p_activity_data->>'ended_at')::timestamptz,
      duration_minutes = (p_activity_data->>'duration_minutes')::integer,
      updated_at = now(),
      revision = next_revision
    where id = existing_activity.id;
  else
    if coalesce(p_expected_revision, 0) <> 0 then
      return jsonb_build_object('status', 'conflict', 'revision', null);
    end if;

    next_revision := 1;

    insert into public.activities (
      baby_id, client_id, created_by, type, occurred_at, created_at,
      updated_at, revision, note, feeding_method, amount_oz,
      diaper_type, started_at, ended_at, duration_minutes
    ) values (
      target_baby_id,
      p_activity_client_id,
      caller_id,
      p_activity_data->>'type',
      (p_activity_data->>'occurred_at')::timestamptz,
      coalesce((p_activity_data->>'created_at')::timestamptz, now()),
      now(),
      next_revision,
      p_activity_data->>'note',
      p_activity_data->>'feeding_method',
      (p_activity_data->>'amount_oz')::numeric,
      p_activity_data->>'diaper_type',
      (p_activity_data->>'started_at')::timestamptz,
      (p_activity_data->>'ended_at')::timestamptz,
      (p_activity_data->>'duration_minutes')::integer
    );
  end if;

  insert into public.activity_mutation_operations (
    operation_id, baby_id, activity_client_id, mutation_kind,
    result_revision, applied_by
  ) values (
    p_operation_id, target_baby_id, p_activity_client_id, p_mutation_kind,
    next_revision, caller_id
  );

  return jsonb_build_object('status', 'applied', 'revision', next_revision);
end;
$$;

create or replace function public.start_active_sleep(
  target_baby_id uuid,
  target_session_id text,
  target_started_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  active public.active_sleep_sessions%rowtype;
begin
  if caller_id is null or not public.can_access_baby(target_baby_id) then
    raise exception 'BABY_ACCESS_REQUIRED';
  end if;
  if target_started_at > now() then raise exception 'SLEEP_START_IN_FUTURE'; end if;

  select * into active from public.active_sleep_sessions
  where baby_id = target_baby_id for update;

  if found then
    if active.session_id <> target_session_id then raise exception 'ACTIVE_SLEEP_EXISTS'; end if;
    return jsonb_build_object(
      'status', 'applied', 'session_id', active.session_id,
      'started_at', active.started_at, 'created_at', active.created_at
    );
  end if;

  insert into public.active_sleep_sessions (
    baby_id, session_id, started_at, created_by
  ) values (
    target_baby_id, target_session_id, target_started_at, caller_id
  ) returning * into active;

  return jsonb_build_object(
    'status', 'applied', 'session_id', active.session_id,
    'started_at', active.started_at, 'created_at', active.created_at
  );
end;
$$;

create or replace function public.complete_active_sleep(
  target_baby_id uuid,
  target_session_id text,
  p_operation_id text,
  p_activity_client_id text,
  target_ended_at timestamptz,
  target_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  active public.active_sleep_sessions%rowtype;
  completed public.sleep_completion_operations%rowtype;
  duration integer;
begin
  if caller_id is null or not public.can_access_baby(target_baby_id) then
    raise exception 'BABY_ACCESS_REQUIRED';
  end if;

  select * into completed from public.sleep_completion_operations
  where sleep_completion_operations.operation_id = p_operation_id;
  if found then
    return jsonb_build_object('status', 'applied', 'activity_client_id', completed.activity_client_id);
  end if;

  select * into active from public.active_sleep_sessions
  where baby_id = target_baby_id for update;

  if not found or active.session_id <> target_session_id then
    raise exception 'SLEEP_SESSION_NOT_ACTIVE';
  end if;
  if target_ended_at <= active.started_at or target_ended_at > now() + interval '1 minute' then
    raise exception 'INVALID_SLEEP_END';
  end if;

  duration := greatest(1, round(extract(epoch from (target_ended_at - active.started_at)) / 60)::integer);

  insert into public.activities (
    baby_id, client_id, created_by, type, occurred_at, created_at,
    updated_at, revision, note, started_at, ended_at, duration_minutes
  ) values (
    target_baby_id, p_activity_client_id, caller_id, 'sleep',
    target_ended_at, target_ended_at, now(), 1, nullif(trim(target_note), ''),
    active.started_at, target_ended_at, duration
  ) on conflict (baby_id, client_id) do nothing;

  insert into public.sleep_completion_operations (
    operation_id, baby_id, session_id, activity_client_id, completed_by
  ) values (
    p_operation_id, target_baby_id, target_session_id, p_activity_client_id, caller_id
  );

  delete from public.active_sleep_sessions
  where baby_id = target_baby_id and session_id = target_session_id;

  return jsonb_build_object(
    'status', 'applied', 'activity_client_id', p_activity_client_id,
    'started_at', active.started_at, 'ended_at', target_ended_at,
    'duration_minutes', duration
  );
end;
$$;

revoke all on function public.apply_activity_mutation(uuid, text, text, text, integer, jsonb) from public, anon;
revoke all on function public.start_active_sleep(uuid, text, timestamptz) from public, anon;
revoke all on function public.complete_active_sleep(uuid, text, text, text, timestamptz, text) from public, anon;
grant execute on function public.apply_activity_mutation(uuid, text, text, text, integer, jsonb) to authenticated;
grant execute on function public.start_active_sleep(uuid, text, timestamptz) to authenticated;
grant execute on function public.complete_active_sleep(uuid, text, text, text, timestamptz, text) to authenticated;
