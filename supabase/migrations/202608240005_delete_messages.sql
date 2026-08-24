drop policy if exists "owners can delete chat media"
  on storage.objects;

create policy "owners can delete chat media"
  on storage.objects
  for delete
  using (
    bucket_id = 'chat-media'
    and owner = auth.uid()
  );

create or replace function public.delete_message(
  target_message_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.messages m
  where m.id = target_message_id
    and m.sender_id = auth.uid();
end;
$$;

alter table public.messages replica identity full;
