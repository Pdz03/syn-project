create or replace function public.delete_message(
  target_message_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages m
  set
    type = 'system',
    content = 'This message was deleted',
    reply_message_id = null
  where m.id = target_message_id
    and m.sender_id = auth.uid();

  delete from public.message_reactions mr
  where mr.message_id = target_message_id;
end;
$$;
