create table if not exists public.map_statuses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.history_summaries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Anonymous traveler',
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint user_profiles_display_name_not_blank check (length(trim(display_name)) > 0),
  constraint user_profiles_display_name_reasonable check (length(display_name) <= 80)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_map_statuses_updated_at on public.map_statuses;
create trigger set_map_statuses_updated_at
before update on public.map_statuses
for each row execute function public.set_updated_at();

drop trigger if exists set_history_summaries_updated_at on public.history_summaries;
create trigger set_history_summaries_updated_at
before update on public.history_summaries
for each row execute function public.set_updated_at();

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

alter table public.map_statuses enable row level security;
alter table public.history_summaries enable row level security;
alter table public.user_profiles enable row level security;

drop policy if exists "Users can read their map statuses" on public.map_statuses;
drop policy if exists "Users can insert their map statuses" on public.map_statuses;
drop policy if exists "Users can update their map statuses" on public.map_statuses;
drop policy if exists "Users can delete their map statuses" on public.map_statuses;

create policy "Users can read their map statuses"
on public.map_statuses
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their map statuses"
on public.map_statuses
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their map statuses"
on public.map_statuses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their map statuses"
on public.map_statuses
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their history summaries" on public.history_summaries;
drop policy if exists "Users can insert their history summaries" on public.history_summaries;
drop policy if exists "Users can update their history summaries" on public.history_summaries;
drop policy if exists "Users can delete their history summaries" on public.history_summaries;

create policy "Users can read their history summaries"
on public.history_summaries
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their history summaries"
on public.history_summaries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their history summaries"
on public.history_summaries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their history summaries"
on public.history_summaries
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read their profile" on public.user_profiles;
drop policy if exists "Users can insert their profile" on public.user_profiles;
drop policy if exists "Users can update their profile" on public.user_profiles;
drop policy if exists "Users can delete their profile" on public.user_profiles;

create policy "Users can read their profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their profile"
on public.user_profiles
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.list_public_gallery()
returns table (
  user_id uuid,
  display_name text,
  map_payload jsonb,
  history_payload jsonb,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    profiles.user_id,
    profiles.display_name,
    coalesce(map_statuses.payload, '{}'::jsonb) as map_payload,
    history_summaries.payload as history_payload,
    greatest(
      profiles.updated_at,
      coalesce(map_statuses.updated_at, profiles.updated_at),
      coalesce(history_summaries.updated_at, profiles.updated_at)
    ) as updated_at
  from public.user_profiles as profiles
  left join public.map_statuses on map_statuses.user_id = profiles.user_id
  left join public.history_summaries on history_summaries.user_id = profiles.user_id
  where profiles.is_public = true
  order by updated_at desc;
$$;

revoke all on function public.list_public_gallery() from public;
grant execute on function public.list_public_gallery() to anon, authenticated;
