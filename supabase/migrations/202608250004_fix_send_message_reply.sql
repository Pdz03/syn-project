drop function if exists public.send_message(uuid, text, uuid);

create or replace function public.send_message(
  target_conversation_id uuid,
  message_content text,
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
  if message_content is null or btrim(message_content) = '' then
    raise exception 'Message content is required';
  end if;

  if not exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'Not a conversation member';
  end if;

  if send_message.reply_message_id is not null and not exists (
    select 1
    from public.messages replied_message
    where replied_message.id = send_message.reply_message_id
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
    'text',
    btrim(message_content),
    send_message.reply_message_id
  )
  returning id into new_message_id;

  return new_message_id;
end;
$$;
