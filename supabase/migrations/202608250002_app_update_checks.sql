create table if not exists public.app_versions (
  platform text primary key,
  latest_version text not null,
  download_url text,
  force_update boolean not null default false,
  message text,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_installations (
  install_id text primary key,
  user_id uuid references public.profiles(id) on delete set null,
  platform text not null,
  installed_version text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.app_versions enable row level security;
alter table public.app_installations enable row level security;

drop policy if exists "authenticated users can read app versions"
  on public.app_versions;

create policy "authenticated users can read app versions"
  on public.app_versions
  for select
  using (auth.uid() is not null);

drop function if exists public.check_app_update(text, text, text, uuid);

create or replace function public.check_app_update(
  p_install_id text,
  p_platform_name text,
  p_installed_version text,
  p_current_user_id uuid default null
)
returns table (
  update_available boolean,
  force_update boolean,
  latest_version text,
  download_url text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_installations (
    install_id,
    user_id,
    platform,
    installed_version,
    last_seen_at
  )
  values (
    p_install_id,
    p_current_user_id,
    p_platform_name,
    p_installed_version,
    now()
  )
  on conflict (install_id) do update
    set
      user_id = excluded.user_id,
      platform = excluded.platform,
      installed_version = excluded.installed_version,
      last_seen_at = excluded.last_seen_at;

  return query
  select
    coalesce(v.latest_version <> p_installed_version, false) as update_available,
    coalesce(v.force_update, false) as force_update,
    v.latest_version,
    v.download_url,
    v.message
  from public.app_versions v
  where v.platform = p_platform_name;
end;
$$;

insert into public.app_versions (
  platform,
  latest_version,
  download_url,
  force_update,
  message
)
values (
  'android',
  '1.0.0',
  null,
  false,
  'A new Syn update is available.'
)
on conflict (platform) do nothing;
