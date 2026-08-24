alter table public.messages
  add column if not exists edited_at timestamptz;

drop function if exists public.get_conversation_messages(uuid);

create or replace function public.get_conversation_messages(
  target_conversation_id uuid
)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  type text,
  content text,
  created_at timestamptz,
  edited_at timestamptz,
  reply_message_id uuid,
  receipt_status text
)
language sql
security definer
set search_path = public
as $$
  select
    m.id,
    m.conversation_id,
    m.sender_id,
    m.type,
    m.content,
    m.created_at,
    m.edited_at,
    m.reply_message_id,
    case
      when m.sender_id <> auth.uid() then null
      when exists (
        select 1
        from public.message_receipts mr
        where mr.message_id = m.id
          and mr.user_id <> auth.uid()
          and mr.read_at is not null
      ) then 'read'
      when exists (
        select 1
        from public.message_receipts mr
        where mr.message_id = m.id
          and mr.user_id <> auth.uid()
          and mr.delivered_at is not null
      ) then 'delivered'
      else 'sent'
    end as receipt_status
  from public.messages m
  where m.conversation_id = target_conversation_id
    and exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = target_conversation_id
        and cm.user_id = auth.uid()
    )
  order by m.created_at asc;
$$;
