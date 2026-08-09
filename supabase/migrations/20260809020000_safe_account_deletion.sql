create or replace function public.delete_sprout_account(
  target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned_circle record;
  remaining_member_count integer;
begin
  if target_user_id is null then
    raise exception 'INVALID_USER';
  end if;

  for owned_circle in
    select member.care_circle_id
    from public.care_circle_members as member
    where member.user_id = target_user_id
      and member.role = 'owner'
    for update
  loop
    select count(*)
    into remaining_member_count
    from public.care_circle_members as member
    where member.care_circle_id =
      owned_circle.care_circle_id
      and member.user_id <> target_user_id;

    if remaining_member_count > 0 then
      raise exception 'OWNER_HAS_MEMBERS';
    end if;
  end loop;

  delete from public.care_circles as circle
  using public.care_circle_members as member
  where member.user_id = target_user_id
    and member.role = 'owner'
    and circle.id = member.care_circle_id;

  delete from public.care_circle_members
  where user_id = target_user_id;

  delete from auth.users
  where id = target_user_id;

  if not found then
    raise exception 'ACCOUNT_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'deleted', true
  );
end;
$$;

revoke all on function public.delete_sprout_account(uuid)
from public, anon, authenticated;

grant execute on function public.delete_sprout_account(uuid)
to service_role;
