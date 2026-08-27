create table if not exists public.survey_links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.survey_links enable row level security;

drop policy if exists "authenticated users can read active survey links"
  on public.survey_links;

create policy "authenticated users can read active survey links"
  on public.survey_links
  for select
  using (
    auth.uid() is not null
    and active = true
  );

create unique index if not exists survey_links_one_active_idx
  on public.survey_links(active)
  where active = true;
