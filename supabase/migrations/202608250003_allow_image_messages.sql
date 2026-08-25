alter table public.messages
  drop constraint if exists message_content_check;

alter table public.messages
  add constraint message_content_check
  check (
    (
      type in ('text', 'image')
      and content is not null
      and btrim(content) <> ''
    )
    or type in ('nudge', 'system')
  );
