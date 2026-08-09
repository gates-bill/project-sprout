do $$
declare
  birth_date_type text;
begin
  select data_type
  into birth_date_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'babies'
      and column_name = 'birth_date';

  if birth_date_type is null then
    raise exception 'BABIES_BIRTH_DATE_COLUMN_MISSING';
  end if;

  if birth_date_type <> 'date' then
    raise exception using
      message = 'BIRTH_DATE_TIMEZONE_DECISION_REQUIRED',
      detail = pg_catalog.format(
        'public.babies.birth_date is %, so an explicit production timezone interpretation is required before converting it to date.',
        birth_date_type
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.babies'::regclass
      and conname = 'babies_birth_date_not_future'
  ) then
    alter table public.babies
      add constraint babies_birth_date_not_future
      check (birth_date <= current_date) not valid;
  end if;

  if not exists (
    select 1 from public.babies
    where birth_date > current_date
  ) then
    alter table public.babies
      validate constraint babies_birth_date_not_future;
  end if;
end;
$$;
