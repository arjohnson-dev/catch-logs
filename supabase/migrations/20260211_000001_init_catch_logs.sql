-- Catch Logs initial schema for Supabase
-- Tables:
--   public.profiles
--   public.fishing_pins
--   public.journal_entries
-- Includes RLS policies and storage policies for per-user folders.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text not null default '',
  last_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fishing_pins (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id bigint generated always as identity primary key,
  pin_id bigint not null references public.fishing_pins (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  fish_type text not null,
  length numeric(6,2),
  weight numeric(6,2),
  lure text not null,
  notes text,
  photo_url text,
  date_time timestamptz not null,
  temperature numeric(5,2),
  wind_speed numeric(5,2),
  wind_direction numeric(5,2),
  cloud_coverage numeric(5,2),
  visibility integer,
  weather_condition text,
  weather_description text,
  created_at timestamptz not null default now(),
  constraint journal_entries_length_positive check (length is null or length > 0),
  constraint journal_entries_weight_positive check (weight is null or weight > 0),
  constraint journal_entries_temperature_range check (temperature is null or temperature between -100 and 150),
  constraint journal_entries_wind_speed_positive check (wind_speed is null or wind_speed >= 0),
  constraint journal_entries_wind_direction_range check (wind_direction is null or wind_direction between 0 and 360),
  constraint journal_entries_cloud_coverage_range check (cloud_coverage is null or cloud_coverage between 0 and 100),
  constraint journal_entries_visibility_positive check (visibility is null or visibility >= 0)
);

create index if not exists idx_fishing_pins_user_created on public.fishing_pins (user_id, created_at desc);
create index if not exists idx_journal_entries_user_datetime on public.journal_entries (user_id, date_time desc);
create index if not exists idx_journal_entries_pin_datetime on public.journal_entries (pin_id, date_time desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
    coalesce(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.enforce_pin_owner_on_entry()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.fishing_pins p
    where p.id = new.pin_id
      and p.user_id = new.user_id
  ) then
    raise exception 'pin_id does not belong to user_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_pin_owner_on_entry on public.journal_entries;
create trigger trg_enforce_pin_owner_on_entry
before insert or update of pin_id, user_id on public.journal_entries
for each row
execute function public.enforce_pin_owner_on_entry();

alter table public.profiles enable row level security;
alter table public.fishing_pins enable row level security;
alter table public.journal_entries enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "pins_select_own" on public.fishing_pins;
create policy "pins_select_own"
on public.fishing_pins
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "pins_insert_own" on public.fishing_pins;
create policy "pins_insert_own"
on public.fishing_pins
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "pins_update_own" on public.fishing_pins;
create policy "pins_update_own"
on public.fishing_pins
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "pins_delete_own" on public.fishing_pins;
create policy "pins_delete_own"
on public.fishing_pins
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "entries_select_own" on public.journal_entries;
create policy "entries_select_own"
on public.journal_entries
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "entries_insert_own" on public.journal_entries;
create policy "entries_insert_own"
on public.journal_entries
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.fishing_pins p
    where p.id = pin_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "entries_update_own" on public.journal_entries;
create policy "entries_update_own"
on public.journal_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.fishing_pins p
    where p.id = pin_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "entries_delete_own" on public.journal_entries;
create policy "entries_delete_own"
on public.journal_entries
for delete
to authenticated
using (auth.uid() = user_id);

-- Storage policies for bucket: catch-photos
-- Create the bucket in Supabase Storage first (or via migration in another step),
-- then keep each file under "<auth.uid()>/<filename>".
drop policy if exists "storage_read_own_catch_photos" on storage.objects;
create policy "storage_read_own_catch_photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'catch-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_upload_own_catch_photos" on storage.objects;
create policy "storage_upload_own_catch_photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'catch-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_update_own_catch_photos" on storage.objects;
create policy "storage_update_own_catch_photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'catch-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'catch-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_delete_own_catch_photos" on storage.objects;
create policy "storage_delete_own_catch_photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'catch-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
