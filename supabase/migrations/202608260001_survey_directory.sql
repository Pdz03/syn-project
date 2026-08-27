alter table public.profiles
  add column if not exists survey_visible boolean not null default true;

update public.profiles
set survey_visible = false;
