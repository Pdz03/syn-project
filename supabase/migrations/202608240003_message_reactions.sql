create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.message_reactions
  add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;

update public.message_reactions mr
set conversation_id = m.conversation_id
from public.messages m
where mr.message_id = m.id
  and mr.conversation_id is null;

alter table public.message_reactions
  alter column conversation_id set not null;

delete from public.message_reactions a
using public.message_reactions b
where a.ctid < b.ctid
  and a.message_id = b.message_id
  and a.user_id = b.user_id;

create unique index if not exists message_reactions_message_user_idx
  on public.message_reactions(message_id, user_id);

create index if not exists message_reactions_conversation_idx
  on public.message_reactions(conversation_id);

alter table public.message_reactions enable row level security;

drop policy if exists "conversation members can read message reactions"
  on public.message_reactions;

create policy "conversation members can read message reactions"
  on public.message_reactions
  for select
  using (
    exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = message_reactions.conversation_id
        and cm.user_id = auth.uid()
    )
  );

create or replace function public.toggle_message_reaction(
  target_message_id uuid,
  reaction_emoji text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_conversation_id uuid;
  existing_emoji text;
begin
  select m.conversation_id
  into target_conversation_id
  from public.messages m
  where m.id = target_message_id;

  if target_conversation_id is null then
    raise exception 'Message not found';
  end if;

  if not exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.user_id = auth.uid()
  ) then
    raise exception 'Not a conversation member';
  end if;

  select mr.emoji
  into existing_emoji
  from public.message_reactions mr
  where mr.message_id = target_message_id
    and mr.user_id = auth.uid();

  if existing_emoji = reaction_emoji then
    delete from public.message_reactions mr
    where mr.message_id = target_message_id
      and mr.user_id = auth.uid();

    return;
  end if;

  insert into public.message_reactions (
    message_id,
    conversation_id,
    user_id,
    emoji
  )
  values (
    target_message_id,
    target_conversation_id,
    auth.uid(),
    reaction_emoji
  )
  on conflict (message_id, user_id) do update
    set emoji = excluded.emoji;
end;
$$;

alter table public.message_reactions replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_reactions'
  ) then
    alter publication supabase_realtime
      add table public.message_reactions;
  end if;
end $$;
