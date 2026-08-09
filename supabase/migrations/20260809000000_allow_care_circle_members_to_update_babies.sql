alter table public.babies enable row level security;

drop policy if exists "Care Circle members can update babies"
on public.babies;

create policy "Care Circle members can update babies"
on public.babies
for update
to authenticated
using (
  exists (
    select 1
    from public.care_circle_members as member
    where member.care_circle_id = babies.care_circle_id
      and member.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.care_circle_members as member
    where member.care_circle_id = babies.care_circle_id
      and member.user_id = (select auth.uid())
  )
);
