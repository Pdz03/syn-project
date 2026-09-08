drop function if exists public.send_image_message(uuid, text);

create or replace function public.send_image_message(
  target_conversation_id uuid,
  media_path text,
  reply_message_id uuid default null
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

  if send_image_message.reply_message_id is not null and not exists (
    select 1
    from public.messages replied_message
    where replied_message.id = send_image_message.reply_message_id
      and replied_message.conversation_id = target_conversation_id
  ) then
    raise exception 'Reply message not found';
  end if;

  insert into public.messages (
    conversation_id,
    sender_id,
    type,
    content,
    reply_message_id
  )
  values (
    target_conversation_id,
    auth.uid(),
    'image',
    media_path,
    send_image_message.reply_message_id
  )
  returning id into new_message_id;

  return new_message_id;
end;
$$;
