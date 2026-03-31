/*
 * Manual journal weather backfill workflow.
 *
 * Why this is split into candidate + staging + apply:
 * Postgres cannot call Open-Meteo directly in a portable way unless your
 * Supabase project has an HTTP-capable extension enabled. This script gives
 * you the exact rows to backfill using each entry's saved timestamp plus the
 * latitude/longitude from the linked fishing pin, then applies the results
 * back into journal_entries.
 *
 * Usage:
 * 1. Run section A to create the helper view and staging table.
 * 2. Run the SELECT in section B to export candidates that need weather.
 * 3. Use that exported dataset to fetch weather externally.
 * 4. Insert the filled values into public.journal_weather_backfill_staging.
 * 5. Run section C to write the values back to public.journal_entries.
 */

begin;

create schema if not exists util;

alter table public.journal_entries
add column if not exists pressure_msl numeric(8,2),
add column if not exists precipitation_probability numeric(5,2);

alter table public.journal_entries
drop constraint if exists journal_entries_pressure_msl_positive,
add constraint journal_entries_pressure_msl_positive
  check (pressure_msl is null or pressure_msl >= 0),
drop constraint if exists journal_entries_precipitation_probability_range,
add constraint journal_entries_precipitation_probability_range
  check (
    precipitation_probability is null
    or precipitation_probability between 0 and 100
  );

create or replace view util.journal_weather_backfill_candidates as
select
  je.id as entry_id,
  je.pin_id,
  je.user_id,
  je.date_time,
  fp.latitude,
  fp.longitude,
  je.temperature,
  je.pressure_msl,
  je.precipitation_probability,
  je.wind_speed,
  je.wind_direction,
  je.cloud_coverage,
  je.visibility,
  je.weather_condition,
  je.weather_description
from public.journal_entries je
join public.fishing_pins fp
  on fp.id = je.pin_id
where
  je.temperature is null
  or je.pressure_msl is null
  or je.wind_speed is null
  or je.wind_direction is null
  or je.cloud_coverage is null
  or je.visibility is null
  or je.weather_condition is null
  or je.weather_description is null;

create table if not exists public.journal_weather_backfill_staging (
  entry_id bigint primary key references public.journal_entries (id) on delete cascade,
  observed_time timestamptz null,
  temperature numeric null,
  pressure_msl numeric null,
  precipitation_probability numeric null,
  wind_speed numeric null,
  wind_direction numeric null,
  cloud_coverage numeric null,
  visibility numeric null,
  weather_condition text null,
  weather_description text null,
  source text null,
  inserted_at timestamptz not null default now()
);

comment on view util.journal_weather_backfill_candidates is
  'Journal entries missing weather data, joined to fishing_pins for timestamp + lat/long based backfill.';

comment on table public.journal_weather_backfill_staging is
  'Populate this table with externally-fetched weather snapshots, then run the apply update below.';

commit;

-- Section B: run this to get the exact rows that need weather backfill.
select
  entry_id,
  pin_id,
  user_id,
  date_time,
  latitude,
  longitude
from util.journal_weather_backfill_candidates
order by date_time asc;

-- Verification 1: inspect stored journal weather values for a specific entry.
-- Replace 123 with the journal entry id you want to inspect.
select
  je.id,
  je.date_time,
  je.temperature,
  je.pressure_msl,
  je.precipitation_probability,
  je.wind_speed,
  je.wind_direction,
  je.cloud_coverage,
  je.visibility,
  je.weather_condition,
  je.weather_description,
  fp.latitude,
  fp.longitude
from public.journal_entries je
join public.fishing_pins fp
  on fp.id = je.pin_id
where je.id = 123;

-- Verification 2: inspect any staged backfill values for that same entry.
-- Replace 123 with the same journal entry id.
select *
from public.journal_weather_backfill_staging
where entry_id = 123;

/*
 * Section C: after you populate public.journal_weather_backfill_staging,
 * run this update to fill missing journal weather values.
 *
 * Example staging insert shape:
 *
 * insert into public.journal_weather_backfill_staging (
 *   entry_id,
 *   observed_time,
 *   temperature,
 *   pressure_msl,
 *   precipitation_probability,
 *   wind_speed,
 *   wind_direction,
 *   cloud_coverage,
 *   visibility,
 *   weather_condition,
 *   weather_description,
 *   source
 * ) values
 *   (
 *     123,
 *     '2026-03-01T14:00:00Z',
 *     49.1,
 *     1026.2,
 *     null,
 *     11.4,
 *     240,
 *     86,
 *     24140,
 *     'overcast',
 *     'Overcast',
 *     'open-meteo archive'
 *   );
 */

with applied as (
  update public.journal_entries je
  set
    temperature = coalesce(je.temperature, s.temperature),
    pressure_msl = coalesce(je.pressure_msl, s.pressure_msl),
    precipitation_probability = coalesce(
      je.precipitation_probability,
      s.precipitation_probability
    ),
    wind_speed = coalesce(je.wind_speed, s.wind_speed),
    wind_direction = coalesce(je.wind_direction, s.wind_direction),
    cloud_coverage = coalesce(je.cloud_coverage, s.cloud_coverage),
    visibility = coalesce(je.visibility, s.visibility),
    weather_condition = coalesce(je.weather_condition, s.weather_condition),
    weather_description = coalesce(je.weather_description, s.weather_description)
  from public.journal_weather_backfill_staging s
  where je.id = s.entry_id
  returning je.id
)
select count(*) as updated_entries
from applied;

-- Verification 3: confirm which rows still have missing pressure afterward.
select
  je.id,
  je.date_time,
  je.pressure_msl,
  fp.latitude,
  fp.longitude
from public.journal_entries je
join public.fishing_pins fp
  on fp.id = je.pin_id
where je.pressure_msl is null
order by je.date_time asc;

-- Optional cleanup after a successful apply:
-- truncate table public.journal_weather_backfill_staging;
