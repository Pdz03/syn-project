insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'chat-media',
  'chat-media',
  false,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "conversation members can read chat media"
  on storage.objects;

create policy "conversation members can read chat media"
  on storage.objects
  for select
  using (
    bucket_id = 'chat-media'
    and exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = (storage.foldername(name))[1]::uuid
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "conversation members can upload chat media"
  on storage.objects;

create policy "conversation members can upload chat media"
  on storage.objects
  for insert
  with check (
    bucket_id = 'chat-media'
    and owner = auth.uid()
    and exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = (storage.foldername(name))[1]::uuid
        and cm.user_id = auth.uid()
    )
  );

create or replace function public.send_image_message(
  target_conversation_id uuid,
  media_path text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_message_id uuid;
begin
  if not exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'Not a conversation member';
  end if;

  if media_path is null or media_path = '' then
    raise exception 'Media path is required';
  end if;

  if split_part(media_path, '/', 1)::uuid <> target_conversation_id then
    raise exception 'Media path conversation mismatch';
  end if;

  insert into public.messages (
    conversation_id,
    sender_id,
    type,
    content
  )
  values (
    target_conversation_id,
    auth.uid(),
    'image',
    media_path
  )
  returning id into new_message_id;

  return new_message_id;
end;
$$;
