insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'baby-profile-photos',
  'baby-profile-photos',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Care Circle members can read baby profile photos"
on storage.objects;

create policy "Care Circle members can read baby profile photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'baby-profile-photos'
  and exists (
    select 1
    from public.care_circle_members as member
    where member.user_id = (select auth.uid())
      and member.care_circle_id::text =
        (storage.foldername(name))[1]
  )
);

drop policy if exists "Care Circle members can upload baby profile photos"
on storage.objects;

create policy "Care Circle members can upload baby profile photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'baby-profile-photos'
  and exists (
    select 1
    from public.care_circle_members as member
    where member.user_id = (select auth.uid())
      and member.care_circle_id::text =
        (storage.foldername(name))[1]
  )
);

drop policy if exists "Care Circle members can update baby profile photos"
on storage.objects;

create policy "Care Circle members can update baby profile photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'baby-profile-photos'
  and exists (
    select 1
    from public.care_circle_members as member
    where member.user_id = (select auth.uid())
      and member.care_circle_id::text =
        (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'baby-profile-photos'
  and exists (
    select 1
    from public.care_circle_members as member
    where member.user_id = (select auth.uid())
      and member.care_circle_id::text =
        (storage.foldername(name))[1]
  )
);

drop policy if exists "Care Circle members can delete baby profile photos"
on storage.objects;

create policy "Care Circle members can delete baby profile photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'baby-profile-photos'
  and exists (
    select 1
    from public.care_circle_members as member
    where member.user_id = (select auth.uid())
      and member.care_circle_id::text =
        (storage.foldername(name))[1]
  )
);
