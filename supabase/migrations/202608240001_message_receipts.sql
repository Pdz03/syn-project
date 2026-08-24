create table if not exists public.message_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_receipts_conversation_user_idx
  on public.message_receipts(conversation_id, user_id);

create index if not exists message_receipts_message_idx
  on public.message_receipts(message_id);

alter table public.message_receipts enable row level security;

drop policy if exists "conversation members can read message receipts"
  on public.message_receipts;

create policy "conversation members can read message receipts"
  on public.message_receipts
  for select
  using (
    exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = message_receipts.conversation_id
        and cm.user_id = auth.uid()
    )
  );

create or replace function public.touch_message_receipts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_message_receipts_updated_at
  on public.message_receipts;

create trigger touch_message_receipts_updated_at
before update on public.message_receipts
for each row
execute function public.touch_message_receipts_updated_at();

create or replace function public.create_message_delivery_receipts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.message_receipts (
    message_id,
    conversation_id,
    user_id,
    delivered_at
  )
  select
    new.id,
    new.conversation_id,
    cm.user_id,
    null
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
  on conflict (message_id, user_id) do update
    set delivered_at = coalesce(
      public.message_receipts.delivered_at,
      excluded.delivered_at
    );

  return new;
end;
$$;

create or replace function public.mark_conversation_delivered(
  target_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.message_receipts (
    message_id,
    conversation_id,
    user_id,
    delivered_at
  )
  select
    m.id,
    m.conversation_id,
    auth.uid(),
    now()
  from public.messages m
  where m.conversation_id = target_conversation_id
    and m.sender_id <> auth.uid()
    and exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = target_conversation_id
        and cm.user_id = auth.uid()
    )
  on conflict (message_id, user_id) do update
    set delivered_at = coalesce(
      public.message_receipts.delivered_at,
      excluded.delivered_at
    );
end;
$$;

drop trigger if exists create_message_delivery_receipts
  on public.messages;

create trigger create_message_delivery_receipts
after insert on public.messages
for each row
execute function public.create_message_delivery_receipts();

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

create or replace function public.get_my_chats_with_receipts()
returns table (
  conversation_id uuid,
  other_user_id uuid,
  display_name text,
  username text,
  syn_id text,
  avatar_url text,
  last_message text,
  last_message_type text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  last_receipt_status text,
  unread_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    cm.conversation_id,
    other_member.user_id as other_user_id,
    other_profile.display_name::text,
    other_profile.username::text,
    other_profile.syn_id::text,
    other_profile.avatar_url::text,
    last_message.content::text as last_message,
    last_message.type::text as last_message_type,
    last_message.created_at as last_message_at,
    last_message.sender_id as last_message_sender_id,
    case
      when last_message.sender_id <> auth.uid() then null
      when exists (
        select 1
        from public.message_receipts mr
        where mr.message_id = last_message.id
          and mr.user_id <> auth.uid()
          and mr.read_at is not null
      ) then 'read'
      when exists (
        select 1
        from public.message_receipts mr
        where mr.message_id = last_message.id
          and mr.user_id <> auth.uid()
          and mr.delivered_at is not null
      ) then 'delivered'
      else 'sent'
    end as last_receipt_status,
    (
      select count(*)
      from public.messages unread_message
      where unread_message.conversation_id = cm.conversation_id
        and unread_message.sender_id <> auth.uid()
        and unread_message.created_at > coalesce(
          cm.last_read_at,
          '-infinity'::timestamptz
        )
    ) as unread_count
  from public.conversation_members cm
  join public.conversation_members other_member
    on other_member.conversation_id = cm.conversation_id
   and other_member.user_id <> auth.uid()
  join public.profiles other_profile
    on other_profile.id = other_member.user_id
  left join lateral (
    select
      m.id,
      m.sender_id,
      m.content,
      m.type,
      m.created_at
    from public.messages m
    where m.conversation_id = cm.conversation_id
    order by m.created_at desc
    limit 1
  ) last_message on true
  where cm.user_id = auth.uid()
  order by last_message.created_at desc nulls last;
$$;

create or replace function public.mark_conversation_read(
  target_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_members
  set last_read_at = now()
  where conversation_id = target_conversation_id
    and user_id = auth.uid();

  insert into public.message_receipts (
    message_id,
    conversation_id,
    user_id,
    delivered_at,
    read_at
  )
  select
    m.id,
    m.conversation_id,
    auth.uid(),
    now(),
    now()
  from public.messages m
  where m.conversation_id = target_conversation_id
    and m.sender_id <> auth.uid()
    and exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = target_conversation_id
        and cm.user_id = auth.uid()
    )
  on conflict (message_id, user_id) do update
    set
      delivered_at = coalesce(
        public.message_receipts.delivered_at,
        excluded.delivered_at
      ),
      read_at = coalesce(
        public.message_receipts.read_at,
        excluded.read_at
      );
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'conversation_members'
      and column_name = 'last_read_at'
  ) then
    insert into public.message_receipts (
      message_id,
      conversation_id,
      user_id,
      delivered_at,
      read_at
    )
    select
      m.id,
      m.conversation_id,
      cm.user_id,
      cm.last_read_at,
      cm.last_read_at
    from public.messages m
    join public.conversation_members cm
      on cm.conversation_id = m.conversation_id
    where cm.user_id <> m.sender_id
      and cm.last_read_at is not null
      and m.created_at <= cm.last_read_at
    on conflict (message_id, user_id) do update
      set
        delivered_at = coalesce(
          public.message_receipts.delivered_at,
          excluded.delivered_at
        ),
        read_at = coalesce(
          public.message_receipts.read_at,
          excluded.read_at
        );
  end if;
end $$;

alter table public.message_receipts replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_receipts'
  ) then
    alter publication supabase_realtime
      add table public.message_receipts;
  end if;
end $$;
