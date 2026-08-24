alter table public.messages
  add column if not exists edited_at timestamptz;

create or replace function public.edit_message(
  target_message_id uuid,
  new_content text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_content is null or btrim(new_content) = '' then
    raise exception 'Message content is required';
  end if;

  update public.messages m
  set
    content = btrim(new_content),
    edited_at = now()
  where m.id = target_message_id
    and m.sender_id = auth.uid()
    and m.type = 'text';
end;
$$;
