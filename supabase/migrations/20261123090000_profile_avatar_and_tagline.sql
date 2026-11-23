alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists tagline text check (char_length(tagline) <= 80);

grant update (display_name, avatar_path, tagline) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Rally avatar owners can insert their own images"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.filename(name) in ('avatar.webp', 'avatar.jpg')
);

create policy "Rally avatar owners can update their own images"
on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.filename(name) in ('avatar.webp', 'avatar.jpg')
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.filename(name) in ('avatar.webp', 'avatar.jpg')
);

create policy "Rally avatar owners can read their own image records"
on storage.objects
for select to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.filename(name) in ('avatar.webp', 'avatar.jpg')
);

create policy "Rally avatar owners can delete their own images"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.filename(name) in ('avatar.webp', 'avatar.jpg')
);
